// ============================================================
// CBC Controller — Primary School Competency-Based Curriculum
// ============================================================
const { query, getClient } = require('../config/database');

// ── Learning Areas ────────────────────────────────────────────
const getLearningAreas = async (req, res) => {
  try {
    const { gradeLevel } = req.query;
    let where = ['la.school_id = $1'];
    const params = [req.schoolId];
    if (gradeLevel) { where.push('la.grade_level = $2'); params.push(gradeLevel); }

    const { rows } = await query(
      `SELECT la.*,
              json_agg(json_build_object('id',s.id,'name',s.name,'code',s.code,'sort_order',s.sort_order)
                ORDER BY s.sort_order) FILTER (WHERE s.id IS NOT NULL) AS strands
       FROM cbc_learning_areas la
       LEFT JOIN cbc_strands s ON s.learning_area_id = la.id
       WHERE ${where.join(' AND ')}
       GROUP BY la.id ORDER BY la.grade_level, la.sort_order`,
      params
    );
    res.json(rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
};

const seedLearningAreas = async (req, res) => {
  try {
    const { gradeLevel = 1 } = req.body;

    const primaryAreas = {
      1: [
        { name: 'English Language Activities', code: 'ENG', category: 'language' },
        { name: 'Kiswahili Language Activities', code: 'KIS', category: 'language' },
        { name: 'Mathematical Activities', code: 'MAT', category: 'science' },
        { name: 'Environmental Activities', code: 'ENV', category: 'science' },
        { name: 'Hygiene and Nutrition', code: 'HYN', category: 'health' },
        { name: 'Creative Arts', code: 'CRE', category: 'arts' },
        { name: 'Religious Education', code: 'REL', category: 'religious' },
        { name: 'Movement and Creative Activities', code: 'MOV', category: 'sports' },
      ],
      4: [
        { name: 'English', code: 'ENG', category: 'language' },
        { name: 'Kiswahili / Kenya Sign Language', code: 'KIS', category: 'language' },
        { name: 'Mathematics', code: 'MAT', category: 'science' },
        { name: 'Integrated Science', code: 'SCI', category: 'science' },
        { name: 'Social Studies', code: 'SST', category: 'social' },
        { name: 'Religious Education', code: 'CRE', category: 'religious' },
        { name: 'Creative Arts & Sports', code: 'CAS', category: 'arts' },
        { name: 'Agriculture & Nutrition', code: 'AGR', category: 'practical' },
        { name: 'Pre-Technical & Pre-Career Education', code: 'PTC', category: 'practical' },
      ],
      7: [
        { name: 'English', code: 'ENG', category: 'language' },
        { name: 'Kiswahili', code: 'KIS', category: 'language' },
        { name: 'Mathematics', code: 'MAT', category: 'science' },
        { name: 'Integrated Science', code: 'SCI', category: 'science' },
        { name: 'Social Studies', code: 'SST', category: 'social' },
        { name: 'Business Studies', code: 'BUS', category: 'business' },
        { name: 'Agriculture', code: 'AGR', category: 'practical' },
        { name: 'Home Science', code: 'HMS', category: 'practical' },
        { name: 'Computer Science', code: 'ICT', category: 'science' },
        { name: 'Creative Arts', code: 'CRE', category: 'arts' },
        { name: 'Physical & Health Education', code: 'PHE', category: 'sports' },
        { name: 'Religious Education', code: 'REL', category: 'religious' },
      ],
    };

    // Determine which set to use based on grade level
    let areas = primaryAreas[1]; // default
    if (gradeLevel >= 4 && gradeLevel <= 6) areas = primaryAreas[4];
    if (gradeLevel >= 7 && gradeLevel <= 9) areas = primaryAreas[7];

    const inserted = [];
    for (const [i, area] of areas.entries()) {
      const { rows } = await query(
        `INSERT INTO cbc_learning_areas (school_id, name, code, grade_level, category, sort_order)
         VALUES ($1,$2,$3,$4,$5,$6)
         ON CONFLICT DO NOTHING RETURNING *`,
        [req.schoolId, area.name, area.code, gradeLevel, area.category, i]
      );
      if (rows.length) inserted.push(rows[0]);
    }

    res.json({ inserted: inserted.length, message: `${inserted.length} learning areas seeded for Grade ${gradeLevel}` });
  } catch (e) { res.status(500).json({ error: e.message }); }
};

// ── Performance Levels ────────────────────────────────────────
const getPerformanceLevels = async (req, res) => {
  try {
    const { rows } = await query(
      `SELECT * FROM cbc_performance_levels WHERE school_id=$1 ORDER BY sort_order`,
      [req.schoolId]
    );
    if (!rows.length) {
      // Auto-seed defaults
      await query('SELECT seed_cbc_levels($1)', [req.schoolId]);
      const { rows: seeded } = await query(
        'SELECT * FROM cbc_performance_levels WHERE school_id=$1 ORDER BY sort_order',
        [req.schoolId]
      );
      return res.json(seeded);
    }
    res.json(rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
};

// ── Assessments ───────────────────────────────────────────────
const getAssessments = async (req, res) => {
  try {
    const { classId, term, academicYearId } = req.query;
    let where = ['a.school_id = $1'];
    const params = [req.schoolId];
    let p = 2;

    if (classId)       { where.push(`a.class_id = $${p++}`); params.push(classId); }
    if (term)          { where.push(`a.term = $${p++}`); params.push(term); }
    if (academicYearId){ where.push(`a.academic_year_id = $${p++}`); params.push(academicYearId); }

    const { rows } = await query(
      `SELECT a.*, la.name AS learning_area_name, la.code AS learning_area_code,
              cl.name AS class_name,
              u.first_name || ' ' || u.last_name AS created_by_name,
              (SELECT COUNT(*) FROM cbc_student_scores s WHERE s.assessment_id = a.id) AS scores_entered
       FROM cbc_assessments a
       LEFT JOIN cbc_learning_areas la ON la.id = a.learning_area_id
       LEFT JOIN classes cl ON cl.id = a.class_id
       LEFT JOIN users u ON u.id = a.created_by
       WHERE ${where.join(' AND ')}
       ORDER BY a.assessment_date DESC`,
      params
    );
    res.json(rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
};

const createAssessment = async (req, res) => {
  try {
    const { classId, learningAreaId, name, assessmentType, maxScore,
            assessmentDate, term, academicYearId } = req.body;

    if (!classId || !learningAreaId || !name) {
      return res.status(400).json({ error: 'Class, learning area, and name required' });
    }

    const { rows } = await query(
      `INSERT INTO cbc_assessments (school_id, class_id, learning_area_id, name,
         assessment_type, max_score, assessment_date, term, academic_year_id, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`,
      [req.schoolId, classId, learningAreaId, name, assessmentType || 'summative',
       maxScore || 100, assessmentDate, term, academicYearId, req.user.id]
    );
    res.status(201).json(rows[0]);
  } catch (e) { res.status(500).json({ error: e.message }); }
};

// ── Scores Entry ──────────────────────────────────────────────
const getAssessmentScores = async (req, res) => {
  try {
    const { assessmentId } = req.params;

    const { rows: assess } = await query(
      `SELECT a.*, la.name AS learning_area_name, cl.name AS class_name
       FROM cbc_assessments a
       JOIN cbc_learning_areas la ON la.id = a.learning_area_id
       JOIN classes cl ON cl.id = a.class_id
       WHERE a.id = $1 AND a.school_id = $2`,
      [assessmentId, req.schoolId]
    );
    if (!assess.length) return res.status(404).json({ error: 'Assessment not found' });

    const { rows: students } = await query(
      `SELECT s.id, s.first_name, s.last_name, s.admission_number,
              sc.score, sc.performance_level, sc.teacher_remarks, sc.is_absent
       FROM students s
       LEFT JOIN cbc_student_scores sc ON sc.student_id = s.id AND sc.assessment_id = $1
       WHERE s.class_id = $2 AND s.is_active = TRUE
       ORDER BY s.first_name, s.last_name`,
      [assessmentId, assess[0].class_id]
    );

    const { rows: levels } = await query(
      'SELECT * FROM cbc_performance_levels WHERE school_id=$1 ORDER BY sort_order',
      [req.schoolId]
    );

    res.json({ assessment: assess[0], students, levels });
  } catch (e) { res.status(500).json({ error: e.message }); }
};

const saveScores = async (req, res) => {
  try {
    const { assessmentId } = req.params;
    const { scores } = req.body; // [{studentId, score, performanceLevel, teacherRemarks, isAbsent}]

    const { rows: levels } = await query(
      'SELECT * FROM cbc_performance_levels WHERE school_id=$1 ORDER BY min_score',
      [req.schoolId]
    );

    const autoLevel = (score) => {
      if (score == null) return null;
      for (const l of [...levels].reverse()) {
        if (score >= (l.min_score || 0)) return l.level_code;
      }
      return levels[levels.length - 1]?.level_code || 'BE';
    };

    let saved = 0;
    for (const s of scores) {
      const level = s.performanceLevel || autoLevel(s.score);
      await query(
        `INSERT INTO cbc_student_scores (assessment_id, student_id, score, performance_level,
           teacher_remarks, is_absent, entered_by)
         VALUES ($1,$2,$3,$4,$5,$6,$7)
         ON CONFLICT (assessment_id, student_id, strand_id)
         DO UPDATE SET score=$3, performance_level=$4, teacher_remarks=$5,
           is_absent=$6, entered_by=$7, entered_at=NOW()`,
        [assessmentId, s.studentId, s.score ?? null, level,
         s.teacherRemarks || null, s.isAbsent || false, req.user.id]
      );
      saved++;
    }

    res.json({ saved, message: `${saved} scores saved` });
  } catch (e) { res.status(500).json({ error: e.message }); }
};

// ── CBC Report Card ───────────────────────────────────────────
const getCBCReportCard = async (req, res) => {
  try {
    const { studentId, term, academicYearId } = req.params;

    const { rows: student } = await query(
      `SELECT s.*, cl.name AS class_name, cl.level AS grade_level,
              p.first_name AS parent_first, p.last_name AS parent_last,
              p.phone AS parent_phone
       FROM students s
       JOIN classes cl ON cl.id = s.class_id
       LEFT JOIN student_parents sp ON sp.student_id = s.id AND sp.is_primary = TRUE
       LEFT JOIN parents p ON p.id = sp.parent_id
       WHERE s.id = $1 AND s.school_id = $2`,
      [studentId, req.schoolId]
    );
    if (!student.length) return res.status(404).json({ error: 'Student not found' });

    // Get all learning areas for this grade
    const { rows: areas } = await query(
      `SELECT la.*,
              json_agg(
                json_build_object(
                  'assessment_name', a.name,
                  'score', sc.score,
                  'level', sc.performance_level,
                  'remarks', sc.teacher_remarks,
                  'is_absent', sc.is_absent
                ) ORDER BY a.assessment_date
              ) FILTER (WHERE a.id IS NOT NULL) AS assessments,
              AVG(sc.score) AS avg_score,
              MODE() WITHIN GROUP (ORDER BY sc.performance_level) AS dominant_level
       FROM cbc_learning_areas la
       LEFT JOIN cbc_assessments a ON a.learning_area_id = la.id
         AND a.class_id = $1 AND a.term = $2
       LEFT JOIN cbc_student_scores sc ON sc.assessment_id = a.id AND sc.student_id = $3
       WHERE la.school_id = $4 AND la.grade_level = $5
       GROUP BY la.id ORDER BY la.sort_order`,
      [student[0].class_id, term, studentId, req.schoolId, student[0].grade_level]
    );

    // Attendance
    const { rows: att } = await query(
      `SELECT COUNT(*) FILTER (WHERE status='present') AS present,
              COUNT(*) FILTER (WHERE status='absent') AS absent,
              COUNT(*) AS total
       FROM attendance_records
       WHERE student_id=$1 AND school_id=$2
         AND date >= (SELECT start_date FROM academic_terms WHERE term=$3 LIMIT 1)`,
      [studentId, req.schoolId, term]
    ).catch(() => ({ rows: [{ present: 0, absent: 0, total: 0 }] }));

    // School info
    const { rows: school } = await query('SELECT * FROM schools WHERE id=$1', [req.schoolId]);

    res.json({
      student: student[0],
      learningAreas: areas,
      attendance: att[0],
      school: school[0],
      term,
      generatedAt: new Date().toISOString(),
    });
  } catch (e) { res.status(500).json({ error: e.message }); }
};

// ── Syllabus Coverage ─────────────────────────────────────────
const getSchemesOfWork = async (req, res) => {
  try {
    const { classId, subjectId, term, week } = req.query;
    let where = ['s.school_id = $1'];
    const params = [req.schoolId];
    let p = 2;

    if (classId)   { where.push(`s.class_id = $${p++}`); params.push(classId); }
    if (subjectId) { where.push(`s.subject_id = $${p++}`); params.push(subjectId); }
    if (term)      { where.push(`s.term = $${p++}`); params.push(term); }
    if (week)      { where.push(`s.week_number = $${p++}`); params.push(week); }

    const { rows } = await query(
      `SELECT s.*, cl.name AS class_name, sub.name AS subject_name,
              u.first_name || ' ' || u.last_name AS teacher_name
       FROM schemes_of_work s
       LEFT JOIN classes cl ON cl.id = s.class_id
       LEFT JOIN subjects sub ON sub.id = s.subject_id
       LEFT JOIN users u ON u.id = s.teacher_id
       WHERE ${where.join(' AND ')}
       ORDER BY s.week_number, s.lesson_number`,
      params
    );
    res.json(rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
};

const saveSchemeEntry = async (req, res) => {
  try {
    const { classId, subjectId, weekNumber, lessonNumber, topic, subTopic,
            objectives, teachingActivities, learningMaterials, referencesText,
            assessmentMethod, term, academicYearId } = req.body;

    if (!classId || !subjectId || !topic) {
      return res.status(400).json({ error: 'Class, subject, and topic required' });
    }

    const { rows } = await query(
      `INSERT INTO schemes_of_work (school_id, class_id, subject_id, teacher_id,
         academic_year_id, term, week_number, lesson_number, topic, sub_topic,
         objectives, teaching_activities, learning_materials, references_text, assessment_method)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)
       ON CONFLICT DO NOTHING RETURNING *`,
      [req.schoolId, classId, subjectId, req.user.id, academicYearId, term,
       weekNumber, lessonNumber, topic, subTopic, objectives, teachingActivities,
       learningMaterials, referencesText, assessmentMethod]
    );
    res.status(201).json(rows[0] || { message: 'Entry already exists' });
  } catch (e) { res.status(500).json({ error: e.message }); }
};

const updateSchemeStatus = async (req, res) => {
  try {
    const { status, teacherNotes, completionDate } = req.body;
    const { rows } = await query(
      `UPDATE schemes_of_work SET status=$1, teacher_notes=$2, completion_date=$3, updated_at=NOW()
       WHERE id=$4 AND school_id=$5 RETURNING *`,
      [status, teacherNotes, completionDate, req.params.id, req.schoolId]
    );
    if (!rows.length) return res.status(404).json({ error: 'Scheme entry not found' });

    // Update coverage summary
    await query(
      `INSERT INTO syllabus_coverage (school_id, class_id, subject_id, teacher_id,
         academic_year_id, term, total_topics, completed_topics)
       SELECT school_id, class_id, subject_id, teacher_id, academic_year_id, term,
              COUNT(*) AS total, COUNT(*) FILTER (WHERE status='completed') AS completed
       FROM schemes_of_work
       WHERE school_id=$1 AND class_id=$2 AND subject_id=$3 AND term=$4
       GROUP BY school_id, class_id, subject_id, teacher_id, academic_year_id, term
       ON CONFLICT (school_id, class_id, subject_id, teacher_id, academic_year_id, term)
       DO UPDATE SET total_topics=EXCLUDED.total_topics, completed_topics=EXCLUDED.completed_topics, updated_at=NOW()`,
      [rows[0].school_id, rows[0].class_id, rows[0].subject_id, rows[0].term]
    ).catch(() => {});

    res.json(rows[0]);
  } catch (e) { res.status(500).json({ error: e.message }); }
};

const getCoverageSummary = async (req, res) => {
  try {
    const { term } = req.query;
    let where = ['sc.school_id = $1'];
    const params = [req.schoolId];
    if (term) { where.push('sc.term = $2'); params.push(term); }

    const { rows } = await query(
      `SELECT sc.*, cl.name AS class_name, sub.name AS subject_name,
              u.first_name || ' ' || u.last_name AS teacher_name
       FROM syllabus_coverage sc
       LEFT JOIN classes cl ON cl.id = sc.class_id
       LEFT JOIN subjects sub ON sub.id = sc.subject_id
       LEFT JOIN users u ON u.id = sc.teacher_id
       WHERE ${where.join(' AND ')}
       ORDER BY sc.coverage_percentage ASC`,
      params
    );

    const overall = rows.length > 0
      ? rows.reduce((s, r) => s + parseFloat(r.coverage_percentage || 0), 0) / rows.length
      : 0;

    res.json({ coverages: rows, overallCoverage: overall.toFixed(1) });
  } catch (e) { res.status(500).json({ error: e.message }); }
};

module.exports = {
  getLearningAreas, seedLearningAreas, getPerformanceLevels,
  getAssessments, createAssessment, getAssessmentScores, saveScores,
  getCBCReportCard,
  getSchemesOfWork, saveSchemeEntry, updateSchemeStatus, getCoverageSummary,
};
