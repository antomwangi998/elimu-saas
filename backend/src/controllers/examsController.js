// ============================================================
// Exams Controller — Full Enterprise Implementation
// Series · Papers · Marks · Grading · Positions · Report Cards
// Broadsheet · Trends · KNEC · Auto-Comments · Comparison
// ============================================================
const { query, withTransaction, paginatedQuery } = require('../config/database');
const { cache } = require('../config/redis');

const getGradingScale = async (schoolId) => {
  // Schema stores grades as JSONB array in a single row; fall back to hardcoded defaults
  const { rows } = await query(
    `SELECT grades FROM grading_scales WHERE school_id=$1 AND is_default=true LIMIT 1`,
    [schoolId]
  );
  if (rows.length && Array.isArray(rows[0].grades) && rows[0].grades.length) {
    return rows[0].grades; // [{grade, min_marks, max_marks, points, remarks?}]
  }
  return [
    { grade:'A',  min_marks:75, max_marks:100, points:12 },
    { grade:'A-', min_marks:70, max_marks:74,  points:11 },
    { grade:'B+', min_marks:65, max_marks:69,  points:10 },
    { grade:'B',  min_marks:60, max_marks:64,  points:9  },
    { grade:'B-', min_marks:55, max_marks:59,  points:8  },
    { grade:'C+', min_marks:50, max_marks:54,  points:7  },
    { grade:'C',  min_marks:45, max_marks:49,  points:6  },
    { grade:'C-', min_marks:40, max_marks:44,  points:5  },
    { grade:'D+', min_marks:35, max_marks:39,  points:4  },
    { grade:'D',  min_marks:30, max_marks:34,  points:3  },
    { grade:'D-', min_marks:25, max_marks:29,  points:2  },
    { grade:'E',  min_marks:0,  max_marks:24,  points:1  },
  ];
};

const computeGrade = (marks, scale) => {
  if (marks === null || marks === undefined) return { grade: null, points: null };
  const m = parseFloat(marks);
  return scale.find(s => m >= parseFloat(s.min_marks) && m <= parseFloat(s.max_marks)) || { grade:'E', points:1 };
};

const computeMeanGrade = (meanPoints) => {
  if (!meanPoints) return null;
  const mp = parseFloat(meanPoints);
  if (mp >= 11.5) return 'A';  if (mp >= 10.5) return 'A-';
  if (mp >= 9.5)  return 'B+'; if (mp >= 8.5)  return 'B';
  if (mp >= 7.5)  return 'B-'; if (mp >= 6.5)  return 'C+';
  if (mp >= 5.5)  return 'C';  if (mp >= 4.5)  return 'C-';
  if (mp >= 3.5)  return 'D+'; if (mp >= 2.5)  return 'D';
  if (mp >= 1.5)  return 'D-'; return 'E';
};

const getExamSeries = async (req, res) => {
  try {
    const { academicYearId, termId, type, isLocked, page = 1, limit = 20 } = req.query;
    let sql = `SELECT es.*, ay.year as academic_year, tc.term as term_name,
               COUNT(DISTINCT ep.id) as paper_count,
               COUNT(DISTINCT ep.id) FILTER (WHERE ep.is_submitted) as submitted_count,
               COUNT(DISTINCT ep.class_id) as class_count,
               u.first_name || ' ' || u.last_name as created_by_name
               FROM exam_series es
               LEFT JOIN academic_years ay ON es.academic_year_id = ay.id
               LEFT JOIN terms_config tc ON es.term_id = tc.id
               LEFT JOIN exam_papers ep ON ep.exam_series_id = es.id AND ep.school_id = es.school_id
               LEFT JOIN users u ON u.id = es.created_by
               WHERE es.school_id = $1`;
    const params = [req.schoolId]; let p = 2;
    if (academicYearId) { sql += ` AND es.academic_year_id=$${p++}`; params.push(academicYearId); }
    if (termId)         { sql += ` AND es.term_id=$${p++}`;          params.push(termId); }
    if (type)           { sql += ` AND es.type=$${p++}`;             params.push(type); }
    if (isLocked !== undefined) { sql += ` AND es.is_locked=$${p++}`; params.push(isLocked === 'true'); }
    sql += ' GROUP BY es.id, ay.year, tc.term, u.first_name, u.last_name ORDER BY es.start_date DESC';
    const result = await paginatedQuery(sql, params, parseInt(page), parseInt(limit));
    res.json(result);
  } catch (e) { res.status(500).json({ error: e.message }); }
};

const getExamSeriesById = async (req, res) => {
  try {
    const { rows } = await query(`
      SELECT es.*, ay.year, tc.term,
             COUNT(DISTINCT ep.id) as total_papers,
             COUNT(DISTINCT ep.id) FILTER (WHERE ep.is_submitted) as submitted,
             COUNT(DISTINCT ep.class_id) as classes_count
      FROM exam_series es
      LEFT JOIN academic_years ay ON es.academic_year_id = ay.id
      LEFT JOIN terms_config tc ON es.term_id = tc.id
      LEFT JOIN exam_papers ep ON ep.exam_series_id = es.id
      WHERE es.id = $1 AND es.school_id = $2
      GROUP BY es.id, ay.year, tc.term`, [req.params.id, req.schoolId]);
    if (!rows.length) return res.status(404).json({ error: 'Not found' });
    res.json(rows[0]);
  } catch (e) { res.status(500).json({ error: e.message }); }
};

const createExamSeries = async (req, res) => {
  try {
    const { name, type, academicYearId, termId, classIds, startDate, endDate, maxMarks, description } = req.body;
    if (!name || !type) return res.status(400).json({ error: 'name and type required' });
    const { rows } = await query(`
      INSERT INTO exam_series(school_id, name, type, academic_year_id, term_id, classes,
        start_date, end_date, max_marks, description, created_by)
      VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING *`,
      [req.schoolId, name, type, academicYearId||null, termId||null, classIds||[],
       startDate||null, endDate||null, maxMarks||100, description||null, req.user.id]);
    if (classIds?.length) {
      await withTransaction(async (client) => {
        for (const classId of classIds) {
          const { rows: subjects } = await client.query(
            `SELECT cs.subject_id, cs.teacher_id FROM class_subjects cs
             WHERE cs.class_id=$1 AND cs.school_id=$2 AND cs.is_active=true`,
            [classId, req.schoolId]);
          for (const s of subjects) {
            await client.query(`
              INSERT INTO exam_papers(exam_series_id, school_id, class_id, subject_id, teacher_id, max_marks)
              VALUES($1,$2,$3,$4,$5,$6) ON CONFLICT(exam_series_id,class_id,subject_id) DO NOTHING`,
              [rows[0].id, req.schoolId, classId, s.subject_id, s.teacher_id, maxMarks||100]);
          }
        }
      });
    }
    res.status(201).json(rows[0]);
  } catch (e) { res.status(500).json({ error: e.message }); }
};

const updateExamSeries = async (req, res) => {
  try {
    const { name, startDate, endDate, description, maxMarks } = req.body;
    const { rows } = await query(`
      UPDATE exam_series SET
        name=COALESCE($1,name), start_date=COALESCE($2,start_date),
        end_date=COALESCE($3,end_date), description=COALESCE($4,description),
        max_marks=COALESCE($5,max_marks), updated_at=NOW()
      WHERE id=$6 AND school_id=$7 AND is_locked=false RETURNING *`,
      [name||null, startDate||null, endDate||null, description||null, maxMarks||null, req.params.id, req.schoolId]);
    if (!rows.length) return res.status(404).json({ error: 'Not found or locked' });
    res.json(rows[0]);
  } catch (e) { res.status(500).json({ error: e.message }); }
};

const deleteExamSeries = async (req, res) => {
  try {
    const { rows } = await query('SELECT * FROM exam_series WHERE id=$1 AND school_id=$2', [req.params.id, req.schoolId]);
    if (!rows.length) return res.status(404).json({ error: 'Not found' });
    if (rows[0].is_locked) return res.status(403).json({ error: 'Cannot delete locked series' });
    await query('DELETE FROM exam_series WHERE id=$1', [req.params.id]);
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
};

const getExamPapers = async (req, res) => {
  try {
    const { classId } = req.query;
    let sql = `
      SELECT ep.*, c.name as class_name, c.level, c.stream,
             sub.name as subject_name, sub.code as subject_code,
             u.first_name || ' ' || u.last_name as teacher_name,
             COUNT(s.id) as total_students,
             COUNT(sm.id) as marks_entered,
             COUNT(sm.id) FILTER (WHERE sm.is_absent) as absences,
             ROUND(AVG(sm.marks) FILTER (WHERE sm.marks IS NOT NULL AND NOT sm.is_absent), 2) as avg_marks
      FROM exam_papers ep
      JOIN classes c ON ep.class_id = c.id
      JOIN subjects sub ON ep.subject_id = sub.id
      LEFT JOIN users u ON ep.teacher_id = u.id
      LEFT JOIN students s ON s.current_class_id = c.id AND s.is_active = true AND s.school_id = $2
      LEFT JOIN student_marks sm ON sm.exam_paper_id = ep.id AND sm.student_id = s.id
      WHERE ep.exam_series_id=$1 AND ep.school_id=$2`;
    const params = [req.params.id, req.schoolId];
    if (classId) { sql += ` AND ep.class_id=$3`; params.push(classId); }
    sql += ' GROUP BY ep.id, c.name, c.level, c.stream, sub.name, sub.code, u.first_name, u.last_name ORDER BY c.level, c.name, sub.name';
    const { rows } = await query(sql, params);
    res.json(rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
};

const getPaperById = async (req, res) => {
  try {
    const { rows } = await query(`
      SELECT ep.*, c.name as class_name, sub.name as subject_name, sub.code,
             es.name as series_name, es.is_locked,
             u.first_name || ' ' || u.last_name as teacher_name
      FROM exam_papers ep
      JOIN classes c ON c.id = ep.class_id JOIN subjects sub ON sub.id = ep.subject_id
      JOIN exam_series es ON es.id = ep.exam_series_id LEFT JOIN users u ON u.id = ep.teacher_id
      WHERE ep.id=$1 AND ep.school_id=$2`, [req.params.id, req.schoolId]);
    if (!rows.length) return res.status(404).json({ error: 'Not found' });
    const paper = rows[0];
    const { rows: marks } = await query(`
      SELECT s.id, s.first_name, s.last_name, s.admission_number,
             sm.marks, sm.grade, sm.points, sm.is_absent, sm.teacher_remarks
      FROM students s
      LEFT JOIN student_marks sm ON sm.student_id = s.id AND sm.exam_paper_id = $1
      WHERE s.current_class_id = $2 AND s.is_active = true AND s.school_id = $3
      ORDER BY sm.marks DESC NULLS LAST, s.first_name`,
      [req.params.id, paper.class_id, req.schoolId]);
    const scored = marks.filter(m => !m.is_absent && m.marks !== null);
    const stats = {
      total: marks.length, entered: scored.length, absences: marks.filter(m=>m.is_absent).length,
      avg: scored.length ? (scored.reduce((s,m)=>s+parseFloat(m.marks),0)/scored.length).toFixed(2) : null,
      highest: scored.length ? Math.max(...scored.map(m=>parseFloat(m.marks))) : null,
      lowest: scored.length ? Math.min(...scored.map(m=>parseFloat(m.marks))) : null,
      pass_count: scored.filter(m=>parseFloat(m.marks)>=50).length,
    };
    res.json({ ...paper, students: marks, stats });
  } catch (e) { res.status(500).json({ error: e.message }); }
};

const getPaperMarks = async (req, res) => {
  try {
    const { rows: paper } = await query(`
      SELECT ep.*, c.name as class_name, c.level,
             sub.name as subject_name, sub.code, es.name as series_name, es.max_marks as series_max_marks
      FROM exam_papers ep JOIN classes c ON c.id = ep.class_id
      JOIN subjects sub ON sub.id = ep.subject_id JOIN exam_series es ON es.id = ep.exam_series_id
      WHERE ep.id=$1 AND ep.school_id=$2`, [req.params.paperId, req.schoolId]);
    if (!paper.length) return res.status(404).json({ error: 'Paper not found' });
    const { rows: students } = await query(`
      SELECT s.id, s.first_name, s.last_name, s.admission_number, s.gender,
             sm.marks, sm.grade, sm.points, sm.is_absent, sm.teacher_remarks, sm.id as mark_id
      FROM students s
      LEFT JOIN student_marks sm ON sm.student_id = s.id AND sm.exam_paper_id = $1
      WHERE s.current_class_id = $2 AND s.is_active = true AND s.school_id = $3
      ORDER BY s.first_name, s.last_name`,
      [req.params.paperId, paper[0].class_id, req.schoolId]);
    const scale = await getGradingScale(req.schoolId);
    res.json({ paper: paper[0], students, scale });
  } catch (e) { res.status(500).json({ error: e.message }); }
};

const enterMarks = async (req, res) => {
  try {
    const { paperId } = req.params;
    const { marks, submit = false } = req.body;
    if (!Array.isArray(marks)) return res.status(400).json({ error: 'marks array required' });
    const { rows: paper } = await query('SELECT * FROM exam_papers WHERE id=$1 AND school_id=$2', [paperId, req.schoolId]);
    if (!paper.length) return res.status(404).json({ error: 'Paper not found' });
    const p = paper[0];
    if (!['super_admin','school_admin','principal','deputy_principal','hod'].includes(req.user.role)) {
      if (p.teacher_id !== req.user.id) return res.status(403).json({ error: 'Not assigned to this paper' });
    }
    const scale = await getGradingScale(req.schoolId);
    let saved = 0, errors = 0;
    await withTransaction(async (client) => {
      for (const m of marks) {
        try {
          const gradeInfo = m.isAbsent ? { grade: null, points: null } : computeGrade(m.marks, scale);
          await client.query(`
            INSERT INTO student_marks(exam_paper_id, student_id, school_id, marks, grade, points, is_absent, teacher_remarks, entered_by)
            VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9)
            ON CONFLICT(exam_paper_id, student_id) DO UPDATE SET
              marks=$4, grade=$5, points=$6, is_absent=$7, teacher_remarks=$8, entered_by=$9, updated_at=NOW()`,
            [paperId, m.studentId, req.schoolId, m.isAbsent ? null : parseFloat(m.marks),
             gradeInfo.grade, gradeInfo.points, m.isAbsent || false, m.teacherRemarks || null, req.user.id]);
          saved++;
        } catch { errors++; }
      }
      if (submit) await client.query('UPDATE exam_papers SET is_submitted=true, submitted_at=NOW() WHERE id=$1', [paperId]);
    });
    res.json({ saved, errors, submitted: submit, message: `${saved} marks ${submit ? 'submitted' : 'saved'}` });
  } catch (e) { res.status(500).json({ error: e.message }); }
};

const getResults = async (req, res) => {
  try {
    const { classId } = req.query;
    const cacheKey = `results:${req.params.id}:${classId||'all'}:${req.schoolId}`;
    const cached = await cache.get(cacheKey);
    if (cached) return res.json(cached);
    let sql = `
      SELECT s.id as student_id, s.admission_number, s.first_name, s.last_name, s.gender,
             c.id as class_id, c.name as class_name, c.level, c.stream,
             sub.id as subject_id, sub.name as subject_name, sub.code as subject_code,
             sm.marks, sm.grade, sm.points, sm.is_absent, sm.teacher_remarks
      FROM students s JOIN classes c ON c.id = s.current_class_id
      JOIN exam_papers ep ON ep.class_id = c.id AND ep.exam_series_id=$1
      JOIN subjects sub ON sub.id = ep.subject_id
      LEFT JOIN student_marks sm ON sm.student_id = s.id AND sm.exam_paper_id = ep.id
      WHERE s.school_id=$2 AND s.is_active=true`;
    const params = [req.params.id, req.schoolId];
    if (classId) { sql += ` AND c.id=$3`; params.push(classId); }
    sql += ' ORDER BY s.first_name, s.last_name, sub.name';
    const { rows } = await query(sql, params);
    const scale = await getGradingScale(req.schoolId);
    const studentMap = {};
    for (const row of rows) {
      if (!studentMap[row.student_id]) {
        studentMap[row.student_id] = { id:row.student_id, admission_number:row.admission_number,
          first_name:row.first_name, last_name:row.last_name, gender:row.gender,
          class_id:row.class_id, class_name:row.class_name, level:row.level, stream:row.stream,
          marks:[], totalMarks:0, totalPoints:0, subjectCount:0 };
      }
      const st = studentMap[row.student_id];
      st.marks.push({ subject_id:row.subject_id, subject_name:row.subject_name, subject_code:row.subject_code,
        marks:row.marks, grade:row.grade, points:row.points, is_absent:row.is_absent, teacher_remarks:row.teacher_remarks });
      if (!row.is_absent && row.marks !== null) {
        st.totalMarks += parseFloat(row.marks || 0);
        st.totalPoints += parseFloat(row.points || 0);
        st.subjectCount++;
      }
    }
    const students = Object.values(studentMap).map(s => {
      const meanMarks = s.subjectCount > 0 ? s.totalMarks / s.subjectCount : null;
      const meanPoints = s.subjectCount > 0 ? s.totalPoints / s.subjectCount : null;
      return { ...s,
        total_marks: s.subjectCount > 0 ? s.totalMarks.toFixed(1) : '—',
        mean_marks: meanMarks !== null ? meanMarks.toFixed(2) : '—',
        mean_points: meanPoints !== null ? meanPoints.toFixed(3) : '—',
        mean_grade: meanPoints !== null ? computeMeanGrade(meanPoints) : '—' };
    });
    const classBuckets = {};
    students.forEach(s => { if (!classBuckets[s.class_id]) classBuckets[s.class_id] = []; classBuckets[s.class_id].push(s); });
    Object.values(classBuckets).forEach(cs => {
      cs.sort((a,b) => parseFloat(b.mean_points)-parseFloat(a.mean_points) || parseFloat(b.mean_marks)-parseFloat(a.mean_marks));
      cs.forEach((s,i) => { s.position = i+1; s.out_of = cs.length; });
    });
    students.sort((a,b) => parseFloat(b.mean_points)-parseFloat(a.mean_points));
    students.forEach((s,i) => s.school_position = i+1);
    const classStats = {};
    Object.entries(classBuckets).forEach(([cid, sts]) => {
      const means = sts.map(s=>parseFloat(s.mean_marks)).filter(m=>m>0);
      const pts = sts.map(s=>parseFloat(s.mean_points)).filter(p=>p>0);
      const mp = pts.length ? pts.reduce((a,b)=>a+b)/pts.length : 0;
      const passCount = sts.filter(s=>parseFloat(s.mean_marks)>=50).length;
      classStats[cid] = { class_name:sts[0].class_name, student_count:sts.length,
        mean_marks: means.length ? (means.reduce((a,b)=>a+b)/means.length).toFixed(2) : '0',
        mean_points: mp.toFixed(3), mean_grade: computeMeanGrade(mp),
        highest: means.length ? Math.max(...means).toFixed(1) : '0',
        lowest: means.length ? Math.min(...means).toFixed(1) : '0',
        pass_rate: sts.length ? ((passCount/sts.length)*100).toFixed(1) : '0', pass_count: passCount };
    });
    const subjectStats = {};
    students.forEach(s => s.marks.forEach(m => {
      if (!subjectStats[m.subject_id]) subjectStats[m.subject_id] = { name:m.subject_name, code:m.subject_code, scores:[], absences:0 };
      if (m.is_absent) subjectStats[m.subject_id].absences++;
      else if (m.marks !== null) subjectStats[m.subject_id].scores.push(parseFloat(m.marks));
    }));
    const subjectAnalysis = Object.values(subjectStats).map(sub => {
      const s = sub.scores; const avg = s.length ? s.reduce((a,b)=>a+b)/s.length : 0;
      const pass = s.filter(m=>m>=50).length;
      return { name:sub.name, code:sub.code, attempts:s.length, absences:sub.absences,
        avg: avg.toFixed(2), highest: s.length ? Math.max(...s) : 0, lowest: s.length ? Math.min(...s) : 0,
        pass_rate: s.length ? ((pass/s.length)*100).toFixed(1) : '0' };
    }).sort((a,b) => parseFloat(b.avg)-parseFloat(a.avg));
    const result = { students, classStats: Object.values(classStats), subjectAnalysis };
    await cache.set(cacheKey, result, 300);
    res.json(result);
  } catch (e) { res.status(500).json({ error: e.message }); }
};

const getStudentReportCard = async (req, res) => {
  try {
    const { id: seriesId, studentId } = req.params;
    const { rows: student } = await query(`
      SELECT s.*, c.name as class_name, c.level, c.stream,
             ct.first_name || ' ' || ct.last_name as class_teacher_name
      FROM students s JOIN classes c ON c.id = s.current_class_id
      LEFT JOIN users ct ON ct.id = c.class_teacher_id
      WHERE s.id=$1 AND s.school_id=$2`, [studentId, req.schoolId]);
    if (!student.length) return res.status(404).json({ error: 'Student not found' });
    const st = student[0];
    const { rows: marks } = await query(`
      SELECT sub.name as subject_name, sub.code, sub.category,
             sm.marks, sm.grade, sm.points, sm.is_absent, sm.teacher_remarks
      FROM student_marks sm JOIN exam_papers ep ON ep.id = sm.exam_paper_id
      JOIN subjects sub ON sub.id = ep.subject_id
      WHERE ep.exam_series_id=$1 AND sm.student_id=$2 AND ep.school_id=$3
      ORDER BY sub.category, sub.name`, [seriesId, studentId, req.schoolId]);
    const scale = await getGradingScale(req.schoolId);
    const scored = marks.filter(m => !m.is_absent && m.marks !== null);
    const totalMarks = scored.reduce((s,m) => s+parseFloat(m.marks), 0);
    const totalPoints = scored.reduce((s,m) => s+parseFloat(m.points||0), 0);
    const meanMarks = scored.length ? totalMarks/scored.length : 0;
    const meanPoints = scored.length ? totalPoints/scored.length : 0;
    const meanGrade = computeMeanGrade(meanPoints);
    const { rows: classRanks } = await query(`
      SELECT sm2.student_id,
             ROUND(AVG(sm2.points) FILTER (WHERE NOT sm2.is_absent AND sm2.marks IS NOT NULL), 3) as mp
      FROM student_marks sm2 JOIN exam_papers ep2 ON ep2.id = sm2.exam_paper_id
      WHERE ep2.exam_series_id=$1 AND ep2.class_id=$2 AND ep2.school_id=$3
      GROUP BY sm2.student_id ORDER BY mp DESC`,
      [seriesId, st.current_class_id, req.schoolId]);
    const position = classRanks.findIndex(r => r.student_id === studentId) + 1;
    const outOf = classRanks.length;
    const { rows: att } = await query(`
      SELECT COUNT(*) FILTER (WHERE status='present') as present,
             COUNT(*) FILTER (WHERE status='absent') as absent,
             COUNT(*) FILTER (WHERE status='late') as late, COUNT(*) as total
      FROM attendance_records WHERE student_id=$1 AND school_id=$2`, [studentId, req.schoolId])
      .catch(() => ({ rows: [{ present:0, absent:0, late:0, total:0 }] }));
    const { rows: school } = await query('SELECT * FROM schools WHERE id=$1', [req.schoolId]);
    const { rows: prev } = await query(`
      SELECT es.name, ROUND(AVG(sm.points) FILTER (WHERE NOT sm.is_absent), 3) as mp,
             ROUND(AVG(sm.marks) FILTER (WHERE NOT sm.is_absent AND sm.marks IS NOT NULL), 2) as mm
      FROM exam_series es JOIN exam_papers ep ON ep.exam_series_id = es.id
      JOIN student_marks sm ON sm.student_id=$1 AND sm.exam_paper_id = ep.id
      WHERE es.school_id=$2 AND es.start_date < (SELECT start_date FROM exam_series WHERE id=$3 LIMIT 1)
      GROUP BY es.id ORDER BY es.start_date DESC LIMIT 4`, [studentId, req.schoolId, seriesId])
      .catch(() => ({ rows: [] }));
    const trends = [...prev.reverse().map(r => ({ name:r.name, meanPoints:r.mp||0, meanMarks:r.mm||0, grade:computeMeanGrade(r.mp) })),
      { name:'Current', meanPoints: meanPoints.toFixed(3), meanMarks: meanMarks.toFixed(2), grade: meanGrade }];
    res.json({ student: st, marks, position, outOf,
      total_marks: totalMarks.toFixed(1), mean_marks: meanMarks.toFixed(2),
      mean_points: meanPoints.toFixed(3), mean_grade: meanGrade,
      attendance: att[0]||{}, trends, school: school[0]||{} });
  } catch (e) { res.status(500).json({ error: e.message }); }
};

const publishExamSeries = async (req, res) => {
  try {
    const { rows } = await query(`
      UPDATE exam_series SET is_published=true, published_at=NOW()
      WHERE id=$1 AND school_id=$2 RETURNING *`, [req.params.id, req.schoolId]);
    if (!rows.length) return res.status(404).json({ error: 'Not found' });
    res.json(rows[0]);
  } catch (e) { res.status(500).json({ error: e.message }); }
};

const lockExamSeries = async (req, res) => {
  try {
    const { rows } = await query(`
      UPDATE exam_series SET is_locked=true, locked_at=NOW(), locked_by=$1
      WHERE id=$2 AND school_id=$3 RETURNING *`, [req.user.id, req.params.id, req.schoolId]);
    if (!rows.length) return res.status(404).json({ error: 'Not found' });
    res.json(rows[0]);
  } catch (e) { res.status(500).json({ error: e.message }); }
};

const getStudentHistory = async (req, res) => {
  try {
    const { rows } = await query(`
      SELECT es.id, es.name, es.type, es.start_date,
             ROUND(AVG(sm.marks) FILTER (WHERE NOT sm.is_absent AND sm.marks IS NOT NULL), 2) as avg_marks,
             ROUND(AVG(sm.points) FILTER (WHERE NOT sm.is_absent), 3) as avg_points,
             COUNT(sm.id) FILTER (WHERE NOT sm.is_absent AND sm.marks IS NOT NULL) as subjects_sat
      FROM exam_series es JOIN exam_papers ep ON ep.exam_series_id = es.id
      JOIN student_marks sm ON sm.exam_paper_id = ep.id
      WHERE sm.student_id=$1 AND es.school_id=$2
      GROUP BY es.id, es.name, es.type, es.start_date
      ORDER BY es.start_date DESC LIMIT 20`, [req.params.studentId, req.schoolId]);
    const history = rows.map(r => ({ ...r, mean_grade: computeMeanGrade(r.avg_points) }));
    res.json(history);
  } catch (e) { res.status(500).json({ error: e.message }); }
};

const getGradingScalePublic = async (req, res) => {
  try {
    const scale = await getGradingScale(req.schoolId);
    res.json(scale);
  } catch (e) { res.status(500).json({ error: e.message }); }
};

const saveGradingScale = async (req, res) => {
  try {
    const { scale } = req.body;
    if (!Array.isArray(scale)) return res.status(400).json({ error: 'scale array required' });
    // Store entire scale as a JSONB array in a single default row per school
    await query(
      `INSERT INTO grading_scales(school_id, grades, is_default)
       VALUES($1, $2::jsonb, true)
       ON CONFLICT(school_id, is_default) DO UPDATE SET grades=$2::jsonb, updated_at=NOW()`,
      [req.schoolId, JSON.stringify(scale)]
    );
    res.json({ success: true, saved: scale.length });
  } catch (e) { res.status(500).json({ error: e.message }); }
};

const getBroadsheet = async (req, res) => {
  try {
    // Series ID comes from query string (route has no :id segment)
    const seriesId = req.params.id || req.query.seriesId;
    const { classId } = req.query;
    const cacheKey = `broadsheet:${seriesId}:${classId||'all'}:${req.schoolId}`;
    const cached = await cache.get(cacheKey);
    if (cached) return res.json(cached);

    // Capture getResults output via a resolving promise instead of fakeRes
    let capturedResult = null;
    const fakeRes = {
      json: (data) => { capturedResult = data; },
      status: () => fakeRes,
    };
    await getResults({ ...req, params: { ...req.params, id: seriesId }, query: { classId } }, fakeRes);
    const results = capturedResult || { students: [], classStats: [], subjectAnalysis: [] };

    // Get class level to determine subject count (Form 1 = 11 subjects, Forms 2-4 = 8)
    let classLevel = null;
    if (classId) {
      const { rows: clRows } = await query('SELECT level FROM classes WHERE id=$1 AND school_id=$2', [classId, req.schoolId]);
      classLevel = clRows[0]?.level;
    }
    const maxSubjects = classLevel === 1 ? 11 : 8;

    // Get subjects actually taken in this exam by this class
    const { rows: subjects } = await query(`
      SELECT DISTINCT sub.id, sub.name, sub.code, sub.category,
             COUNT(sm.id) as mark_count
      FROM exam_papers ep 
      JOIN subjects sub ON sub.id = ep.subject_id
      LEFT JOIN student_marks sm ON sm.exam_paper_id = ep.id
      WHERE ep.exam_series_id=$1 AND ep.school_id=$2 ${classId ? 'AND ep.class_id=$3' : ''}
      AND ep.is_submitted = true
      GROUP BY sub.id, sub.name, sub.code, sub.category
      ORDER BY sub.category, sub.name
      LIMIT ${maxSubjects}`,
      classId ? [seriesId, req.schoolId, classId] : [seriesId, req.schoolId]);
    // Fetch school info for header
    const { rows: schoolRows } = await query('SELECT name,address,county,phone,motto,logo_url,cover_photo_url FROM schools WHERE id=$1', [req.schoolId]);
    // Fetch series info  
    const { rows: seriesRows } = await query('SELECT name,type,start_date,end_date FROM exam_series WHERE id=$1', [seriesId]);
    const data = { subjects, ...results, school: schoolRows[0]||{}, series: seriesRows[0]||{} };
    await cache.set(cacheKey, data, 300);
    res.json(data);
  } catch (e) { res.status(500).json({ error: e.message }); }
};


const bulkSaveMarks = async (req, res) => {
  const { query, withTransaction } = require('../config/database');
  try {
    const { seriesId, classId, subjectId, marks } = req.body;
    if (!seriesId || !classId || !subjectId || !marks?.length) {
      return res.status(400).json({ error: 'seriesId, classId, subjectId and marks required' });
    }
    // Get or create exam paper
    let { rows: paperRows } = await query(
      `SELECT id FROM exam_papers WHERE exam_series_id=$1 AND class_id=$2 AND subject_id=$3 AND school_id=$4`,
      [seriesId, classId, subjectId, req.schoolId]
    );
    let paperId;
    if (!paperRows.length) {
      const { rows: newPaper } = await query(
        `INSERT INTO exam_papers(id,exam_series_id,school_id,class_id,subject_id,teacher_id,max_marks,is_submitted,submitted_at,hod_approved)
         VALUES(gen_random_uuid(),$1,$2,$3,$4,$5,100,true,NOW(),false) RETURNING id`,
        [seriesId, req.schoolId, classId, subjectId, req.user.id]
      );
      paperId = newPaper[0].id;
    } else {
      paperId = paperRows[0].id;
    }
    // Upsert marks
    let saved = 0;
    for (const m of marks) {
      const { g, pts } = gradeFromMarks(m.marks);
      await query(
        `INSERT INTO student_marks(id,exam_paper_id,student_id,school_id,marks,grade,points,is_absent,teacher_remarks,entered_by,entered_at)
         VALUES(gen_random_uuid(),$1,$2,$3,$4,$5,$6,$7,$8,$9,NOW())
         ON CONFLICT(exam_paper_id,student_id)
         DO UPDATE SET marks=$4,grade=$5,points=$6,is_absent=$7,teacher_remarks=COALESCE($8,student_marks.teacher_remarks),entered_by=$9,entered_at=NOW()`,
        [paperId, m.studentId, req.schoolId, m.isAbsent?null:m.marks, m.isAbsent?null:g, m.isAbsent?null:pts, !!m.isAbsent, m.teacherRemarks||null, req.user.id]
      );
      saved++;
    }
    // Mark paper as submitted
    await query(`UPDATE exam_papers SET is_submitted=true,submitted_at=NOW() WHERE id=$1`,[paperId]);
    res.json({ message: `${saved} marks saved`, saved });
  } catch(e) { res.status(500).json({ error: e.message }); }
};

function gradeFromMarks(m) {
  if(!m) return {g:'E',pts:1};
  if(m>=75)return{g:'A',pts:12};if(m>=70)return{g:'A-',pts:11};if(m>=65)return{g:'B+',pts:10};
  if(m>=60)return{g:'B',pts:9};if(m>=55)return{g:'B-',pts:8};if(m>=50)return{g:'C+',pts:7};
  if(m>=45)return{g:'C',pts:6};if(m>=40)return{g:'C-',pts:5};if(m>=35)return{g:'D+',pts:4};
  if(m>=30)return{g:'D',pts:3};if(m>=25)return{g:'D-',pts:2};return{g:'E',pts:1};
}


module.exports = {
  getExamSeries, getExamSeriesById, createExamSeries, updateExamSeries, deleteExamSeries,
  getExamPapers, getPaperById, getPaperMarks, enterMarks,
  getResults, getBroadsheet, getStudentReportCard,
  publishExamSeries, lockExamSeries, getStudentHistory,
  getGradingScalePublic, saveGradingScale, bulkSaveMarks,
};
