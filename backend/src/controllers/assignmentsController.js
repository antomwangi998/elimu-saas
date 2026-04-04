// ============================================================
// Assignments Controller
// ============================================================
const { query, withTransaction, paginatedQuery } = require('../config/database');

const getAssignments = async (req, res) => {
  const { classId, subjectId, status, teacherId, isHomework } = req.query;
  let sql = `
    SELECT a.*, sub.name as subject_name, c.name as class_name,
           u.first_name||' '||u.last_name as teacher_name,
           COUNT(asub.id) as total_students,
           COUNT(asub.id) FILTER (WHERE asub.status='submitted' OR asub.status='graded') as submitted,
           COUNT(asub.id) FILTER (WHERE asub.status='pending' AND a.due_date < NOW()) as overdue
    FROM assignments a
    JOIN subjects sub ON a.subject_id=sub.id
    JOIN classes c ON a.class_id=c.id
    JOIN users u ON a.teacher_id=u.id
    LEFT JOIN students st ON st.current_class_id=a.class_id AND st.is_active=true
    LEFT JOIN assignment_submissions asub ON asub.assignment_id=a.id AND asub.student_id=st.id
    WHERE a.school_id=$1
  `;
  const params = [req.schoolId]; let i = 2;
  if (classId) { sql += ` AND a.class_id=$${i++}`; params.push(classId); }
  if (subjectId) { sql += ` AND a.subject_id=$${i++}`; params.push(subjectId); }
  if (status) { sql += ` AND a.status=$${i++}`; params.push(status); }
  if (teacherId) { sql += ` AND a.teacher_id=$${i++}`; params.push(teacherId); }
  if (isHomework !== undefined) { sql += ` AND a.is_homework=$${i++}`; params.push(isHomework === 'true'); }
  sql += ' GROUP BY a.id, sub.name, c.name, u.first_name, u.last_name ORDER BY a.due_date DESC';
  const result = await paginatedQuery(sql, params, parseInt(req.query.page||1), 30);
  res.json(result);
};

const createAssignment = async (req, res) => {
  const { classId, subjectId, title, description, instructions, dueDate, maxMarks, attachmentUrls, allowLate, isHomework, academicYearId, termId } = req.body;
  if (!classId || !subjectId || !title || !dueDate) return res.status(400).json({ error: 'classId, subjectId, title, dueDate required' });

  const { rows } = await query(
    `INSERT INTO assignments(school_id, class_id, subject_id, teacher_id, title, description, instructions,
       due_date, max_marks, attachment_urls, allow_late, is_homework, academic_year_id, term_id, status)
     VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10::jsonb,$11,$12,$13,$14,'published') RETURNING *`,
    [req.schoolId, classId, subjectId, req.user.id, title, description, instructions,
     dueDate, maxMarks||100, JSON.stringify(attachmentUrls||[]),
     allowLate||false, isHomework !== false, academicYearId, termId]
  );

  // Add timeline event for all students in class
  await query(
    `INSERT INTO student_timeline(school_id, student_id, event_type, title, description, event_date, category, colour, metadata)
     SELECT $1, s.id, 'assignment', $2, $3, $4, 'academic', '#3b82f6', $5::jsonb
     FROM students s WHERE s.current_class_id=$6 AND s.is_active=true`,
    [req.schoolId, `New Assignment: ${title}`,
     `Due: ${new Date(dueDate).toLocaleDateString('en-KE')}`,
     new Date().toISOString().split('T')[0],
     JSON.stringify({ assignmentId: rows[0].id, dueDate }), classId]
  );

  res.status(201).json(rows[0]);
};

const submitAssignment = async (req, res) => {
  const { assignmentId, content, attachmentUrls } = req.body;

  // Get student from user
  const { rows: studentRows } = await query(
    'SELECT id FROM students WHERE user_id=$1 AND school_id=$2 LIMIT 1',
    [req.user.id, req.schoolId]
  );
  if (!studentRows.length) return res.status(404).json({ error: 'Student profile not found' });
  const studentId = studentRows[0].id;

  const { rows: assignRows } = await query('SELECT * FROM assignments WHERE id=$1', [assignmentId]);
  if (!assignRows.length) return res.status(404).json({ error: 'Assignment not found' });
  const assignment = assignRows[0];

  const isLate = new Date() > new Date(assignment.due_date);
  if (isLate && !assignment.allow_late) {
    return res.status(400).json({ error: 'Assignment due date has passed and late submissions are not allowed' });
  }

  const { rows } = await query(
    `INSERT INTO assignment_submissions(assignment_id, student_id, school_id, content, attachment_urls, submitted_at, status, is_late)
     VALUES($1,$2,$3,$4,$5::jsonb,NOW(),$6,$7)
     ON CONFLICT(assignment_id, student_id) DO UPDATE SET
       content=$4, attachment_urls=$5::jsonb, submitted_at=NOW(), status=$6, is_late=$7
     RETURNING *`,
    [assignmentId, studentId, req.schoolId, content, JSON.stringify(attachmentUrls||[]),
     isLate ? 'late' : 'submitted', isLate]
  );
  res.status(201).json(rows[0]);
};

const gradeSubmission = async (req, res) => {
  const { submissionId, marks, feedback } = req.body;
  const { rows: sub } = await query('SELECT * FROM assignment_submissions WHERE id=$1', [submissionId]);
  if (!sub.length) return res.status(404).json({ error: 'Submission not found' });

  const { rows: assignRows } = await query('SELECT max_marks FROM assignments WHERE id=$1', [sub[0].assignment_id]);
  const maxMarks = assignRows[0]?.max_marks || 100;
  const pct = (marks / maxMarks) * 100;
  const grade = pct >= 75 ? 'A' : pct >= 60 ? 'B' : pct >= 50 ? 'C' : pct >= 40 ? 'D' : 'E';

  const { rows } = await query(
    `UPDATE assignment_submissions SET marks=$1, grade=$2, feedback=$3, status='graded', graded_by=$4, graded_at=NOW()
     WHERE id=$5 RETURNING *`,
    [marks, grade, feedback, req.user.id, submissionId]
  );
  res.json(rows[0]);
};

module.exports = { getAssignments, createAssignment, submitAssignment, gradeSubmission };
