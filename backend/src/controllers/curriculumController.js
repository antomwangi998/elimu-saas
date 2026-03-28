// ============================================================
// Curriculum Controller
// Handles CBC (Form 1-2) and 8-4-4 (Form 3-4) dual systems
// KNEC grading, strands/sub-strands, marks entry, report cards
// ============================================================
const { query, withTransaction, paginatedQuery } = require('../config/database');
const { cache } = require('../config/redis');
const {
  KNEC_SCALE, getKnecGrade, getCbcLevel,
  get844Comment, getCbcComment,
  seedKnecScale, seedAutoComments,
  getDefaultSubjectsForLevel,
} = require('../services/autoCommentEngine');

// ── Detect curriculum type from class level ───────────────────
const getCurriculumType = (level) => level <= 2 ? 'cbc' : '844';

// ============================================================
// SUBJECT MANAGEMENT
// ============================================================

// GET /api/curriculum/subjects?level=&classId=
const getSubjectsByLevel = async (req, res) => {
  const { level, classId } = req.query;
  if (!level && !classId) return res.status(400).json({ error: 'level or classId required' });

  let classLevel = parseInt(level);
  if (classId) {
    const { rows } = await query('SELECT level FROM classes WHERE id=$1', [classId]);
    if (!rows.length) return res.status(404).json({ error: 'Class not found' });
    classLevel = rows[0].level;
  }

  const curriculum = getCurriculumType(classLevel);
  const { rows } = await query(
    `SELECT s.*, cs.teacher_id, u.first_name || ' ' || u.last_name as teacher_name,
            cs.periods_per_week, cs.id as class_subject_id
     FROM subjects s
     LEFT JOIN class_subjects cs ON cs.subject_id=s.id AND cs.class_id=$1
     LEFT JOIN users u ON cs.teacher_id=u.id
     WHERE s.school_id=$2 AND s.curriculum=$3
     ORDER BY s.category, s.name`,
    [classId || null, req.schoolId, curriculum]
  );
  res.json({ curriculum, classLevel, subjects: rows });
};

// POST /api/curriculum/subjects/seed — seed default subjects for school
const seedDefaultSubjects = async (req, res) => {
  const { level } = req.body;
  if (!level) return res.status(400).json({ error: 'level required' });

  const defaults = getDefaultSubjectsForLevel(parseInt(level));
  let created = 0;

  await withTransaction(async (client) => {
    for (const s of defaults) {
      await client.query(
        `INSERT INTO subjects(school_id, name, code, category, is_compulsory, knec_code, curriculum)
         VALUES($1,$2,$3,$4,$5,$6,$7) ON CONFLICT(school_id,code) DO UPDATE
         SET curriculum=$7, is_compulsory=$5`,
        [req.schoolId, s.name, s.code, s.category, s.is_compulsory, s.knec_code || null, s.curriculum]
      );
      created++;
    }
    await seedKnecScale(req.schoolId, client);
    await seedAutoComments(req.schoolId, client);
  });

  res.json({ message: `${created} subjects seeded for level ${level}`, curriculum: getCurriculumType(level) });
};

// POST /api/curriculum/student-subjects — student selects optional subjects (Form 3-4)
const selectStudentSubjects = async (req, res) => {
  const { studentId, subjectIds, academicYearId } = req.body;
  if (!studentId || !subjectIds?.length) return res.status(400).json({ error: 'studentId and subjectIds required' });

  // Validate student is Form 3 or 4
  const { rows: studentRows } = await query(
    'SELECT s.id, c.level FROM students s LEFT JOIN classes c ON s.current_class_id=c.id WHERE s.id=$1 AND s.school_id=$2',
    [studentId, req.schoolId]
  );
  if (!studentRows.length) return res.status(404).json({ error: 'Student not found' });
  if (studentRows[0].level < 3) {
    return res.status(400).json({ error: 'Subject selection only applies to Form 3 and 4 (8-4-4 system)' });
  }

  // Ensure compulsory subjects are included
  const { rows: compulsory } = await query(
    `SELECT id FROM subjects WHERE school_id=$1 AND curriculum='844' AND is_compulsory=true`,
    [req.schoolId]
  );
  const allSubjectIds = [...new Set([...compulsory.map(s => s.id), ...subjectIds])];

  if (allSubjectIds.length < 7) {
    return res.status(400).json({ error: 'A minimum of 7 subjects must be selected for KCSE (including 3 compulsory)' });
  }

  await withTransaction(async (client) => {
    // Clear existing selections for this year
    await client.query(
      'DELETE FROM student_subject_selections WHERE student_id=$1 AND academic_year_id=$2',
      [studentId, academicYearId]
    );
    for (const subjectId of allSubjectIds) {
      const isComp = compulsory.some(c => c.id === subjectId);
      await client.query(
        `INSERT INTO student_subject_selections(school_id, student_id, academic_year_id, subject_id, is_compulsory, status)
         VALUES($1,$2,$3,$4,$5,'approved')`,
        [req.schoolId, studentId, academicYearId, subjectId, isComp]
      );
    }
  });

  res.json({ message: `${allSubjectIds.length} subjects assigned`, subjectCount: allSubjectIds.length });
};

// GET /api/curriculum/student-subjects/:studentId
const getStudentSubjects = async (req, res) => {
  const { academicYearId } = req.query;
  const { rows } = await query(
    `SELECT sss.*, s.name as subject_name, s.code, s.category, s.curriculum, s.is_compulsory as default_compulsory
     FROM student_subject_selections sss
     JOIN subjects s ON sss.subject_id=s.id
     WHERE sss.student_id=$1 AND sss.school_id=$2
     ${academicYearId ? 'AND sss.academic_year_id=$3' : ''}
     ORDER BY s.is_compulsory DESC, s.category, s.name`,
    [req.params.studentId, req.schoolId, ...(academicYearId ? [academicYearId] : [])]
  );
  res.json(rows);
};

// ============================================================
// CBC MARKS ENTRY (Form 1 & 2)
// ============================================================

// GET /api/curriculum/cbc/strands?subjectId=
const getCbcStrands = async (req, res) => {
  const { subjectId } = req.query;
  const { rows } = await query(
    `SELECT str.*, json_agg(sub ORDER BY sub.sort_order) as sub_strands
     FROM cbc_strands str
     LEFT JOIN cbc_sub_strands sub ON sub.strand_id=str.id
     WHERE str.school_id=$1 ${subjectId ? 'AND str.subject_id=$2' : ''}
     GROUP BY str.id ORDER BY str.sort_order`,
    [req.schoolId, ...(subjectId ? [subjectId] : [])]
  );
  res.json(rows);
};

// POST /api/curriculum/cbc/strands — create strands for a subject
const createCbcStrand = async (req, res) => {
  const { subjectId, name, code, weight, subStrands = [] } = req.body;
  if (!subjectId || !name) return res.status(400).json({ error: 'subjectId and name required' });

  const result = await withTransaction(async (client) => {
    const { rows } = await client.query(
      `INSERT INTO cbc_strands(school_id, subject_id, name, code, weight)
       VALUES($1,$2,$3,$4,$5) RETURNING *`,
      [req.schoolId, subjectId, name, code, weight || 1.0]
    );
    const strand = rows[0];
    for (let i = 0; i < subStrands.length; i++) {
      await client.query(
        `INSERT INTO cbc_sub_strands(strand_id, school_id, name, code, sort_order)
         VALUES($1,$2,$3,$4,$5)`,
        [strand.id, req.schoolId, subStrands[i].name, subStrands[i].code, i]
      );
    }
    return strand;
  });
  res.status(201).json(result);
};

// POST /api/curriculum/cbc/marks — enter CBC performance levels
const enterCbcMarks = async (req, res) => {
  const { examSeriesId, classId, subjectId, entries } = req.body;
  // entries: [{studentId, subStrandId, performanceLevel}]

  if (!examSeriesId || !entries?.length) {
    return res.status(400).json({ error: 'examSeriesId and entries required' });
  }

  // Verify class is CBC (Form 1 or 2)
  const { rows: classRows } = await query('SELECT level FROM classes WHERE id=$1', [classId]);
  if (!classRows.length || classRows[0].level > 2) {
    return res.status(400).json({ error: 'CBC marks only apply to Form 1 and 2' });
  }

  let saved = 0;
  await withTransaction(async (client) => {
    for (const e of entries) {
      if (!['EE', 'ME', 'AE', 'BE'].includes(e.performanceLevel)) continue;
      await client.query(
        `INSERT INTO cbc_marks(school_id, student_id, sub_strand_id, exam_series_id, performance_level, teacher_remarks, entered_by)
         VALUES($1,$2,$3,$4,$5,$6,$7)
         ON CONFLICT(student_id, sub_strand_id, exam_series_id) DO UPDATE SET
           performance_level=$5, teacher_remarks=$6, entered_by=$7, updated_at=NOW()`,
        [req.schoolId, e.studentId, e.subStrandId, examSeriesId, e.performanceLevel, e.remarks || null, req.user.id]
      );
      saved++;
    }
  });

  res.json({ message: `${saved} CBC marks saved` });
};

// GET /api/curriculum/cbc/marks?examSeriesId=&classId=
const getCbcMarks = async (req, res) => {
  const { examSeriesId, classId, studentId } = req.query;

  const { rows } = await query(
    `SELECT cm.*, s.first_name, s.last_name, s.admission_number,
            sub_s.name as sub_strand_name, sub_s.code as sub_strand_code,
            str.name as strand_name, sub.name as subject_name, sub.code as subject_code
     FROM cbc_marks cm
     JOIN students s ON cm.student_id=s.id
     JOIN cbc_sub_strands sub_s ON cm.sub_strand_id=sub_s.id
     JOIN cbc_strands str ON sub_s.strand_id=str.id
     JOIN subjects sub ON str.subject_id=sub.id
     WHERE cm.school_id=$1 AND cm.exam_series_id=$2
     ${classId ? 'AND s.current_class_id=$3' : ''}
     ${studentId ? `AND cm.student_id=$${classId ? 4 : 3}` : ''}
     ORDER BY s.first_name, sub.name, str.sort_order`,
    [req.schoolId, examSeriesId, ...(classId ? [classId] : []), ...(studentId ? [studentId] : [])]
  );
  res.json(rows);
};

// ============================================================
// 8-4-4 MARKS ENTRY (Form 3 & 4)
// ============================================================

// POST /api/curriculum/844/marks — enter marks with KNEC auto-grading
const enter844Marks = async (req, res) => {
  const { examSeriesId, paperId, classId, marks } = req.body;
  // marks: [{studentId, marks, isAbsent, remarks}]

  if (!examSeriesId || !marks?.length) {
    return res.status(400).json({ error: 'examSeriesId and marks required' });
  }

  // Validate class is 8-4-4 (Form 3-4)
  if (classId) {
    const { rows: classRows } = await query('SELECT level FROM classes WHERE id=$1', [classId]);
    if (!classRows.length || classRows[0].level < 3) {
      return res.status(400).json({ error: '8-4-4 marks only apply to Form 3 and 4' });
    }
  }

  // Get school's custom KNEC scale or use default
  const { rows: scaleRows } = await query(
    'SELECT grade, min_marks as min, max_marks as max, points FROM knec_grade_scale WHERE school_id=$1 ORDER BY min_marks DESC',
    [req.schoolId]
  );
  const scale = scaleRows.length ? scaleRows : null;

  let saved = 0;
  await withTransaction(async (client) => {
    for (const m of marks) {
      const gradeInfo = m.isAbsent ? null : getKnecGrade(m.marks, scale);
      await client.query(
        `INSERT INTO student_marks(exam_paper_id, student_id, school_id, marks, grade, points, is_absent, remarks, entered_by)
         VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9)
         ON CONFLICT(exam_paper_id, student_id) DO UPDATE SET
           marks=$4, grade=$5, points=$6, is_absent=$7, remarks=$8, entered_by=$9, updated_at=NOW()`,
        [paperId, m.studentId, req.schoolId,
         m.isAbsent ? null : parseFloat(m.marks),
         m.isAbsent ? null : gradeInfo?.grade,
         m.isAbsent ? null : gradeInfo?.points,
         m.isAbsent || false, m.remarks || null, req.user.id]
      );
      saved++;
    }
    if (paperId) {
      await client.query(
        'UPDATE exam_papers SET is_submitted=true, submitted_at=NOW() WHERE id=$1',
        [paperId]
      );
    }
  });

  res.json({ message: `${saved} marks saved with KNEC grading` });
};

// GET /api/curriculum/844/marks?examSeriesId=&classId=
const get844Marks = async (req, res) => {
  const { examSeriesId, classId, subjectId } = req.query;

  const { rows } = await query(
    `SELECT sm.*, s.first_name, s.last_name, s.admission_number, s.gender,
            sub.name as subject_name, sub.code, ep.max_marks,
            c.name as class_name, c.level
     FROM student_marks sm
     JOIN students s ON sm.student_id=s.id
     JOIN exam_papers ep ON sm.exam_paper_id=ep.id
     JOIN subjects sub ON ep.subject_id=sub.id
     JOIN classes c ON ep.class_id=c.id
     WHERE sm.school_id=$1 AND ep.exam_series_id=$2
     ${classId ? 'AND ep.class_id=$3' : ''}
     ${subjectId ? `AND ep.subject_id=$${classId ? 4 : 3}` : ''}
     ORDER BY s.first_name, sub.name`,
    [req.schoolId, examSeriesId, ...(classId ? [classId] : []), ...(subjectId ? [subjectId] : [])]
  );
  res.json(rows);
};

// ============================================================
// REPORT CARDS (Both Systems)
// ============================================================

// GET /api/curriculum/report-card/:studentId?examSeriesId=
const getFullReportCard = async (req, res) => {
  const { studentId } = req.params;
  const { examSeriesId } = req.query;
  if (!examSeriesId) return res.status(400).json({ error: 'examSeriesId required' });

  // Student + class info
  const { rows: studentRows } = await query(
    `SELECT s.*,
            c.name as class_name, c.level, c.stream, c.label as form_label,
            u_ct.first_name || ' ' || u_ct.last_name as class_teacher_name,
            sch.name as school_name, sch.logo_url, sch.address, sch.phone as school_phone,
            sch.motto, sch.email as school_email,
            ay.year, tc.term, es.name as exam_name, es.type as exam_type
     FROM students s
     JOIN classes c ON s.current_class_id=c.id
     LEFT JOIN users u_ct ON c.class_teacher_id=u_ct.id
     JOIN schools sch ON s.school_id=sch.id
     CROSS JOIN exam_series es
     LEFT JOIN academic_years ay ON es.academic_year_id=ay.id
     LEFT JOIN terms_config tc ON es.term_id=tc.id
     WHERE s.id=$1 AND s.school_id=$2 AND es.id=$3`,
    [studentId, req.schoolId, examSeriesId]
  );
  if (!studentRows.length) return res.status(404).json({ error: 'Student or exam not found' });
  const student = studentRows[0];
  const curriculum = getCurriculumType(student.level);

  let subjectsData = [];
  let summary = {};
  let autoComment = '';

  if (curriculum === 'cbc') {
    // ── CBC Report Card ───────────────────────────────────────
    const { rows: cbcData } = await query(
      `SELECT sub.name as subject, sub.code,
              str.name as strand, str.weight,
              sub_s.name as sub_strand,
              cm.performance_level, cm.level_score, cm.teacher_remarks
       FROM cbc_marks cm
       JOIN cbc_sub_strands sub_s ON cm.sub_strand_id=sub_s.id
       JOIN cbc_strands str ON sub_s.strand_id=str.id
       JOIN subjects sub ON str.subject_id=sub.id
       WHERE cm.student_id=$1 AND cm.exam_series_id=$2 AND cm.school_id=$3
       ORDER BY sub.name, str.sort_order, sub_s.sort_order`,
      [studentId, examSeriesId, req.schoolId]
    );

    // Group by subject → strand → sub_strands
    const bySubject = {};
    for (const row of cbcData) {
      if (!bySubject[row.code]) {
        bySubject[row.code] = { subject: row.subject, code: row.code, strands: {}, totalScore: 0, count: 0 };
      }
      if (!bySubject[row.code].strands[row.strand]) {
        bySubject[row.code].strands[row.strand] = { name: row.strand, weight: row.weight, subStrands: [], avgLevel: 0 };
      }
      bySubject[row.code].strands[row.strand].subStrands.push({
        name: row.sub_strand, level: row.performance_level, score: row.level_score, remarks: row.teacher_remarks,
      });
      bySubject[row.code].totalScore += row.level_score;
      bySubject[row.code].count++;
    }

    subjectsData = Object.values(bySubject).map(sub => {
      const meanScore = sub.count ? (sub.totalScore / sub.count) : 0;
      const cbcLevel = getCbcLevel(meanScore);
      Object.values(sub.strands).forEach(str => {
        const scores = str.subStrands.map(s => s.score);
        str.avgLevel = scores.length ? (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(1) : 0;
        str.levelInfo = getCbcLevel(str.avgLevel);
      });
      return { ...sub, strands: Object.values(sub.strands), meanScore: meanScore.toFixed(2), overallLevel: cbcLevel };
    });

    const allScores = cbcData.map(c => c.level_score);
    const meanLevel = allScores.length ? (allScores.reduce((a, b) => a + b, 0) / allScores.length) : 0;
    const overallCbc = getCbcLevel(meanLevel);
    autoComment = await getCbcComment(req.schoolId, meanLevel);

    summary = {
      curriculum: 'cbc',
      meanLevel: meanLevel.toFixed(2),
      overallLevel: overallCbc.level,
      overallLabel: overallCbc.label,
      subjectCount: subjectsData.length,
      autoComment,
    };

  } else {
    // ── 8-4-4 Report Card ─────────────────────────────────────
    const { rows: marks844 } = await query(
      `SELECT sub.name as subject, sub.code, sub.knec_code, sub.category,
              sm.marks, sm.grade, sm.points, sm.is_absent, sm.remarks,
              ep.max_marks
       FROM student_marks sm
       JOIN exam_papers ep ON sm.exam_paper_id=ep.id
       JOIN subjects sub ON ep.subject_id=sub.id
       WHERE sm.student_id=$1 AND ep.exam_series_id=$2 AND sm.school_id=$3
       ORDER BY sub.is_compulsory DESC, sub.category, sub.name`,
      [studentId, examSeriesId, req.schoolId]
    );

    subjectsData = marks844;
    const active = marks844.filter(m => !m.is_absent && m.marks !== null);
    const totalMarks = active.reduce((s, m) => s + parseFloat(m.marks), 0);
    const totalPoints = active.reduce((s, m) => s + parseFloat(m.points || 0), 0);
    const subjectCount = active.length;
    const meanMarks = subjectCount ? (totalMarks / subjectCount).toFixed(1) : 0;
    const meanPoints = subjectCount ? (totalPoints / subjectCount).toFixed(2) : 0;
    const meanGradeInfo = getKnecGrade(meanMarks);
    autoComment = await get844Comment(req.schoolId, meanPoints);

    // Class rank
    const { rows: rankRows } = await query(
      `SELECT sm.student_id, AVG(sm.marks) as avg
       FROM student_marks sm
       JOIN exam_papers ep ON sm.exam_paper_id=ep.id
       WHERE ep.exam_series_id=$1 AND ep.class_id=$2 AND sm.school_id=$3 AND sm.is_absent=false
       GROUP BY sm.student_id ORDER BY avg DESC`,
      [examSeriesId, student.current_class_id, req.schoolId]
    );
    const rank = rankRows.findIndex(r => r.student_id === studentId) + 1;

    // Grade distribution for class
    const gradeCount = {};
    KNEC_SCALE.forEach(s => { gradeCount[s.grade] = 0; });
    marks844.forEach(m => { if (m.grade && gradeCount[m.grade] !== undefined) gradeCount[m.grade]++; });

    summary = {
      curriculum: '844',
      totalMarks: totalMarks.toFixed(1),
      meanMarks,
      totalPoints: totalPoints.toFixed(1),
      meanPoints,
      meanGrade: meanGradeInfo.grade,
      subjectCount,
      classRank: rank,
      classSize: rankRows.length,
      autoComment,
      gradeDistribution: gradeCount,
    };
  }

  // Attendance
  const { rows: attRows } = await query(
    `SELECT COUNT(*) as total,
            COUNT(*) FILTER (WHERE status='present') as present,
            COUNT(*) FILTER (WHERE status='absent') as absent,
            COUNT(*) FILTER (WHERE status='late') as late
     FROM attendance_records
     WHERE student_id=$1 AND school_id=$2`,
    [studentId, req.schoolId]
  );

  // Previous term performance (for trend)
  const { rows: trendRows } = await query(
    `SELECT es.name, AVG(sm.marks) as avg_marks, AVG(sm.points) as avg_points
     FROM student_marks sm
     JOIN exam_papers ep ON sm.exam_paper_id=ep.id
     JOIN exam_series es ON ep.exam_series_id=es.id
     WHERE sm.student_id=$1 AND sm.school_id=$2 AND sm.is_absent=false
       AND es.id != $3
     GROUP BY es.id ORDER BY es.created_at DESC LIMIT 3`,
    [studentId, req.schoolId, examSeriesId]
  );

  res.json({
    school: {
      name: student.school_name, logo: student.logo_url,
      address: student.address, phone: student.school_phone,
      motto: student.motto, email: student.school_email,
    },
    student: {
      id: student.id, admissionNumber: student.admission_number,
      name: `${student.first_name} ${student.last_name}`,
      gender: student.gender, dateOfBirth: student.date_of_birth,
      photo: student.photo_url, className: student.class_name,
      formLabel: student.form_label, stream: student.stream,
      classTeacher: student.class_teacher_name,
    },
    exam: { name: student.exam_name, type: student.exam_type, year: student.year, term: student.term },
    curriculum,
    subjects: subjectsData,
    summary,
    attendance: attRows[0],
    performanceTrend: trendRows,
  });
};

// ============================================================
// KNEC GRADE SCALE MANAGEMENT
// ============================================================

const getKnecScale = async (req, res) => {
  const { rows } = await query(
    'SELECT * FROM knec_grade_scale WHERE school_id=$1 ORDER BY min_marks DESC',
    [req.schoolId]
  );
  if (!rows.length) {
    // Return default if not seeded
    return res.json(KNEC_SCALE.map(s => ({ ...s, school_id: req.schoolId })));
  }
  res.json(rows);
};

const updateKnecScale = async (req, res) => {
  const { scales } = req.body;
  if (!Array.isArray(scales)) return res.status(400).json({ error: 'scales array required' });

  await withTransaction(async (client) => {
    await client.query('DELETE FROM knec_grade_scale WHERE school_id=$1', [req.schoolId]);
    for (const s of scales) {
      await client.query(
        `INSERT INTO knec_grade_scale(school_id, grade, min_marks, max_marks, points, remarks)
         VALUES($1,$2,$3,$4,$5,$6)`,
        [req.schoolId, s.grade, s.minMarks, s.maxMarks, s.points, s.remarks]
      );
    }
  });
  res.json({ message: 'KNEC scale updated' });
};

// ============================================================
// AUTO COMMENT MANAGEMENT
// ============================================================

const getAutoComments = async (req, res) => {
  const { curriculum } = req.query;
  let sql = 'SELECT * FROM auto_comment_templates WHERE school_id=$1';
  const params = [req.schoolId];
  if (curriculum) { sql += ' AND curriculum=$2'; params.push(curriculum); }
  sql += ' ORDER BY curriculum, min_score DESC';
  const { rows } = await query(sql, params);
  res.json(rows);
};

const upsertAutoComment = async (req, res) => {
  const { id, curriculum, minScore, maxScore, gradeLabel, comment, commentType } = req.body;
  if (id) {
    const { rows } = await query(
      `UPDATE auto_comment_templates SET curriculum=$1, min_score=$2, max_score=$3,
         grade_label=$4, comment=$5, comment_type=$6 WHERE id=$7 AND school_id=$8 RETURNING *`,
      [curriculum, minScore, maxScore, gradeLabel, comment, commentType || 'performance', id, req.schoolId]
    );
    return res.json(rows[0]);
  }
  const { rows } = await query(
    `INSERT INTO auto_comment_templates(school_id, curriculum, min_score, max_score, grade_label, comment, comment_type)
     VALUES($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
    [req.schoolId, curriculum, minScore, maxScore, gradeLabel, comment, commentType || 'performance']
  );
  res.status(201).json(rows[0]);
};

const deleteAutoComment = async (req, res) => {
  await query('DELETE FROM auto_comment_templates WHERE id=$1 AND school_id=$2', [req.params.id, req.schoolId]);
  res.json({ message: 'Comment template deleted' });
};

// ============================================================
// BROADSHEET / CLASS ANALYSIS
// ============================================================

const getClassBroadsheet = async (req, res) => {
  const { examSeriesId, classId } = req.query;
  if (!examSeriesId || !classId) return res.status(400).json({ error: 'examSeriesId and classId required' });

  const { rows: classRow } = await query('SELECT level, name FROM classes WHERE id=$1', [classId]);
  if (!classRow.length) return res.status(404).json({ error: 'Class not found' });
  const curriculum = getCurriculumType(classRow[0].level);

  if (curriculum === 'cbc') {
    // CBC broadsheet: mean performance level per student
    const { rows } = await query(
      `SELECT s.id, s.admission_number, s.first_name, s.last_name, s.gender,
              sub.code as subject_code,
              ROUND(AVG(cm.level_score)::numeric, 2) as mean_score
       FROM students s
       LEFT JOIN cbc_marks cm ON cm.student_id=s.id AND cm.exam_series_id=$1
       LEFT JOIN cbc_sub_strands sub_s ON cm.sub_strand_id=sub_s.id
       LEFT JOIN cbc_strands str ON sub_s.strand_id=str.id
       LEFT JOIN subjects sub ON str.subject_id=sub.id
       WHERE s.current_class_id=$2 AND s.school_id=$3 AND s.is_active=true
       GROUP BY s.id, sub.code ORDER BY s.first_name`,
      [examSeriesId, classId, req.schoolId]
    );
    const students = {};
    const codes = new Set();
    for (const row of rows) {
      codes.add(row.subject_code);
      if (!students[row.id]) {
        students[row.id] = {
          admissionNumber: row.admission_number,
          name: `${row.first_name} ${row.last_name}`,
          gender: row.gender, subjects: {}, totalLevel: 0, count: 0,
        };
      }
      if (row.subject_code) {
        const lvl = getCbcLevel(row.mean_score);
        students[row.id].subjects[row.subject_code] = { score: row.mean_score, level: lvl.level };
        students[row.id].totalLevel += parseFloat(row.mean_score || 0);
        students[row.id].count++;
      }
    }
    const result = Object.values(students).map(s => ({
      ...s, meanLevel: s.count ? (s.totalLevel / s.count).toFixed(2) : 0,
      overallLevel: getCbcLevel(s.count ? s.totalLevel / s.count : 0).level,
    })).sort((a, b) => b.meanLevel - a.meanLevel)
      .map((s, i) => ({ ...s, rank: i + 1 }));

    return res.json({ curriculum: 'cbc', className: classRow[0].name, subjects: [...codes], students: result });
  }

  // 8-4-4 broadsheet
  const { rows } = await query(
    `SELECT s.id, s.admission_number, s.first_name, s.last_name, s.gender,
            sub.code as subject_code, sm.marks, sm.grade, sm.points, sm.is_absent
     FROM students s
     LEFT JOIN student_marks sm ON sm.student_id=s.id AND sm.school_id=s.school_id
     LEFT JOIN exam_papers ep ON sm.exam_paper_id=ep.id AND ep.exam_series_id=$1
     LEFT JOIN subjects sub ON ep.subject_id=sub.id
     WHERE s.current_class_id=$2 AND s.school_id=$3 AND s.is_active=true
     ORDER BY s.first_name, sub.code`,
    [examSeriesId, classId, req.schoolId]
  );

  const students = {};
  const codes = new Set();
  for (const row of rows) {
    codes.add(row.subject_code);
    if (!students[row.id]) {
      students[row.id] = {
        admissionNumber: row.admission_number,
        name: `${row.first_name} ${row.last_name}`,
        gender: row.gender, subjects: {}, totalMarks: 0, totalPoints: 0, count: 0,
      };
    }
    if (row.subject_code && !row.is_absent) {
      students[row.id].subjects[row.subject_code] = { marks: row.marks, grade: row.grade, points: row.points };
      students[row.id].totalMarks += parseFloat(row.marks || 0);
      students[row.id].totalPoints += parseFloat(row.points || 0);
      students[row.id].count++;
    }
  }

  const result = Object.values(students).map(s => ({
    ...s,
    meanMarks: s.count ? (s.totalMarks / s.count).toFixed(1) : 0,
    meanPoints: s.count ? (s.totalPoints / s.count).toFixed(2) : 0,
    meanGrade: getKnecGrade(s.count ? s.totalMarks / s.count : 0).grade,
  })).sort((a, b) => b.meanPoints - a.meanPoints)
    .map((s, i) => ({ ...s, rank: i + 1 }));

  return res.json({ curriculum: '844', className: classRow[0].name, subjects: [...codes].filter(Boolean), students: result });
};

module.exports = {
  getSubjectsByLevel, seedDefaultSubjects,
  selectStudentSubjects, getStudentSubjects,
  getCbcStrands, createCbcStrand, enterCbcMarks, getCbcMarks,
  enter844Marks, get844Marks,
  getFullReportCard,
  getKnecScale, updateKnecScale,
  getAutoComments, upsertAutoComment, deleteAutoComment,
  getClassBroadsheet,
};
