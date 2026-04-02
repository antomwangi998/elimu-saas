// ============================================================
// Online Exam Controller — Auto-marking, Anti-cheat, Sessions
// ============================================================
const { query, withTransaction } = require('../config/database');
const { getKnecGrade } = require('../services/autoCommentEngine');
const logger = require('../config/logger');

// ── GET /api/online-exams — list exams ────────────────────────
const getOnlineExams = async (req, res) => {
  const { classId, subjectId, status } = req.query;
  let sql = `
    SELECT oe.*,
           c.name as class_name, sub.name as subject_name,
           u.first_name||' '||u.last_name as teacher_name,
           COUNT(ea.id) as attempt_count,
           COUNT(ea.id) FILTER (WHERE ea.is_submitted=true) as submitted_count
    FROM online_exams oe
    JOIN classes c ON oe.class_id=c.id
    JOIN subjects sub ON oe.subject_id=sub.id
    JOIN users u ON oe.teacher_id=u.id
    LEFT JOIN exam_attempts ea ON ea.online_exam_id=oe.id
    WHERE oe.school_id=$1
  `;
  const params = [req.schoolId]; let i = 2;
  if (classId) { sql += ` AND oe.class_id=$${i++}`; params.push(classId); }
  if (subjectId) { sql += ` AND oe.subject_id=$${i++}`; params.push(subjectId); }
  if (status) { sql += ` AND oe.status=$${i++}`; params.push(status); }
  sql += ' GROUP BY oe.id, c.name, sub.name, u.first_name, u.last_name ORDER BY oe.created_at DESC';
  const { rows } = await query(sql, params);
  res.json(rows);
};

// ── POST /api/online-exams — create ──────────────────────────
const createOnlineExam = async (req, res) => {
  const {
    examSeriesId, classId, subjectId, title, instructions,
    durationMinutes, totalMarks, passMarks, questionCount,
    randomizeQuestions, randomizeOptions, showResultImmediately,
    allowReview, maxAttempts, startTime, endTime,
    antiCheatEnabled, questions,
  } = req.body;
  if (!classId || !subjectId || !title || !durationMinutes) {
    return res.status(400).json({ error: 'classId, subjectId, title, durationMinutes required' });
  }

  const { rows } = await query(
    `INSERT INTO online_exams(
       school_id, exam_series_id, class_id, subject_id, teacher_id,
       title, instructions, duration_minutes, total_marks, pass_marks,
       question_count, randomize_questions, randomize_options,
       show_result_immediately, allow_review, max_attempts,
       start_time, end_time, anti_cheat_enabled, questions, status
     ) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,'published') RETURNING *`,
    [req.schoolId, examSeriesId, classId, subjectId, req.user.id,
     title, instructions, durationMinutes, totalMarks||100, passMarks||50,
     questionCount||40, randomizeQuestions!==false, randomizeOptions!==false,
     showResultImmediately||false, allowReview||false, maxAttempts||1,
     startTime, endTime, antiCheatEnabled!==false, questions||[]]
  );
  res.status(201).json(rows[0]);
};

// ── POST /api/online-exams/:examId/start — student starts ─────
const startExam = async (req, res) => {
  const { examId } = req.params;

  // Get student profile
  const { rows: studentRows } = await query(
    'SELECT id FROM students WHERE user_id=$1 AND school_id=$2 LIMIT 1',
    [req.user.id, req.schoolId]
  );
  if (!studentRows.length) return res.status(404).json({ error: 'Student profile not found' });
  const studentId = studentRows[0].id;

  // Get exam
  const { rows: examRows } = await query(
    'SELECT * FROM online_exams WHERE id=$1 AND school_id=$2',
    [examId, req.schoolId]
  );
  if (!examRows.length) return res.status(404).json({ error: 'Exam not found' });
  const exam = examRows[0];

  if (!['published','active'].includes(exam.status)) {
    return res.status(400).json({ error: `Exam is ${exam.status} — cannot start` });
  }
  const now = new Date();
  if (exam.start_time && new Date(exam.start_time) > now) {
    return res.status(400).json({ error: `Exam starts at ${new Date(exam.start_time).toLocaleString()}` });
  }
  if (exam.end_time && new Date(exam.end_time) < now) {
    return res.status(400).json({ error: 'Exam window has closed' });
  }

  // Check previous attempts
  const { rows: prevAttempts } = await query(
    'SELECT * FROM exam_attempts WHERE online_exam_id=$1 AND student_id=$2 ORDER BY attempt_number',
    [examId, studentId]
  );
  if (prevAttempts.length >= exam.max_attempts) {
    return res.status(400).json({ error: `Maximum attempts (${exam.max_attempts}) reached` });
  }
  // Check if unsubmitted attempt exists
  const openAttempt = prevAttempts.find(a => !a.is_submitted);
  if (openAttempt) {
    return res.json({ attempt: openAttempt, resumed: true, message: 'Resuming existing attempt' });
  }

  // Prepare questions (with randomization)
  let questionIds = [...(exam.questions || [])];
  if (exam.randomize_questions) {
    // Fisher-Yates shuffle
    for (let i = questionIds.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [questionIds[i], questionIds[j]] = [questionIds[j], questionIds[i]];
    }
    questionIds = questionIds.slice(0, exam.question_count);
  }

  // Create attempt
  const { rows } = await query(
    `INSERT INTO exam_attempts(
       online_exam_id, student_id, school_id, question_order, attempt_number,
       time_remaining, last_activity, ip_address
     ) VALUES($1,$2,$3,$4,$5,$6,NOW(),$7) RETURNING *`,
    [examId, studentId, req.schoolId, questionIds, prevAttempts.length + 1,
     exam.duration_minutes * 60, req.ip]
  );
  const attempt = rows[0];

  // Fetch questions (shuffle options if needed)
  const { rows: questions } = await query(
    `SELECT id, question_text, question_type, options, marks, topic, difficulty
     FROM question_bank WHERE id=ANY($1) ORDER BY array_position($1, id)`,
    [questionIds]
  );

  const displayQuestions = questions.map(q => {
    let opts = q.options || [];
    if (exam.randomize_options && opts.length > 1) {
      for (let i = opts.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [opts[i], opts[j]] = [opts[j], opts[i]];
      }
    }
    // NEVER send correct_answer to frontend
    return {
      id: q.id, questionText: q.question_text, questionType: q.question_type,
      options: opts.map(o => ({ label: o.label, text: o.text })), // strip is_correct
      marks: q.marks, topic: q.topic, difficulty: q.difficulty,
    };
  });

  res.json({ attempt, questions: displayQuestions, durationSeconds: exam.duration_minutes * 60 });
};

// ── POST /api/online-exams/:examId/save-progress ─────────────
const saveProgress = async (req, res) => {
  const { attemptId, answers, timeRemaining, tabSwitches, focusLost } = req.body;

  await query(
    `UPDATE exam_attempts SET
       answers=$1::jsonb, time_remaining=$2,
       tab_switches=tab_switches+$3,
       focus_lost_count=focus_lost_count+$4,
       last_activity=NOW()
     WHERE id=$5 AND is_submitted=false`,
    [JSON.stringify(answers||{}), timeRemaining, tabSwitches||0, focusLost||0, attemptId]
  );

  // Anti-cheat: flag if too many tab switches
  const { rows } = await query(
    'SELECT tab_switches, focus_lost_count FROM exam_attempts WHERE id=$1', [attemptId]
  );
  if (rows[0] && rows[0].tab_switches >= 5) {
    await query(
      `UPDATE exam_attempts SET suspicious_activity=suspicious_activity||$1::jsonb WHERE id=$2`,
      [JSON.stringify([{ type: 'excessive_tab_switches', count: rows[0].tab_switches, at: new Date() }]), attemptId]
    );
  }

  res.json({ saved: true, timeRemaining });
};

// ── POST /api/online-exams/:examId/submit ─────────────────────
const submitExam = async (req, res) => {
  const { attemptId, answers } = req.body;

  // Get attempt + exam
  const { rows: attemptRows } = await query(
    `SELECT ea.*, oe.show_result_immediately, oe.pass_marks, oe.total_marks
     FROM exam_attempts ea JOIN online_exams oe ON ea.online_exam_id=oe.id
     WHERE ea.id=$1 AND ea.is_submitted=false`,
    [attemptId]
  );
  if (!attemptRows.length) return res.status(404).json({ error: 'Attempt not found or already submitted' });
  const attempt = attemptRows[0];

  const finalAnswers = answers || attempt.answers || {};

  // Auto-mark: fetch correct answers
  const questionIds = attempt.question_order || Object.keys(finalAnswers);
  const { rows: questions } = await query(
    'SELECT id, question_type, options, correct_answer, marks FROM question_bank WHERE id=ANY($1)',
    [questionIds]
  );

  let autoMarks = 0;
  const marking = {};

  for (const q of questions) {
    const studentAnswer = finalAnswers[q.id];
    let correct = false;

    if (q.question_type === 'mcq' || q.question_type === 'true_false') {
      // Find the correct option
      const correctOption = (q.options||[]).find(o => o.is_correct);
      correct = correctOption && (studentAnswer === correctOption.label || studentAnswer === correctOption.text);
    } else if (q.question_type === 'fill_blank' || q.question_type === 'short_answer') {
      correct = q.correct_answer &&
        studentAnswer?.toString().toLowerCase().trim() === q.correct_answer.toLowerCase().trim();
    }
    // Essays need manual marking
    if (['mcq','true_false','fill_blank'].includes(q.question_type)) {
      const pts = correct ? (q.marks || 1) : 0;
      autoMarks += pts;
      marking[q.id] = { correct, points: pts, studentAnswer };
    }
  }

  const totalPossible = questions.filter(q => ['mcq','true_false','fill_blank'].includes(q.question_type))
    .reduce((s, q) => s + (q.marks || 1), 0);
  const percentage = totalPossible > 0 ? ((autoMarks / totalPossible) * 100) : 0;
  const gradeInfo = getKnecGrade(percentage);
  const timeSpent = attempt.time_remaining
    ? (attempt.duration_minutes * 60 - attempt.time_remaining)
    : null;

  const { rows: updatedRows } = await query(
    `UPDATE exam_attempts SET
       is_submitted=true, submitted_at=NOW(),
       answers=$1::jsonb, auto_marks=$2, total_marks=$3,
       grade=$4, percentage=$5, time_spent_seconds=$6
     WHERE id=$7 RETURNING *`,
    [JSON.stringify(finalAnswers), autoMarks, autoMarks,
     gradeInfo.grade, percentage, timeSpent, attemptId]
  );

  const result = {
    message: 'Exam submitted successfully',
    attemptId, timeSpent,
    ...(attempt.show_result_immediately ? {
      autoMarks, percentage: percentage.toFixed(1), grade: gradeInfo.grade,
      passed: percentage >= attempt.pass_marks, marking,
    } : {
      message: 'Exam submitted. Results will be released by your teacher.',
    }),
  };

  res.json(result);
};

// ── GET /api/online-exams/:examId/results — teacher view ──────
const getExamResults = async (req, res) => {
  const { rows } = await query(
    `SELECT ea.*,
            s.first_name, s.last_name, s.admission_number,
            c.name as class_name,
            ROUND(ea.total_marks::numeric, 1) as marks,
            ea.grade, ea.percentage
     FROM exam_attempts ea
     JOIN students s ON ea.student_id=s.id
     LEFT JOIN classes c ON s.current_class_id=c.id
     WHERE ea.online_exam_id=$1 AND ea.school_id=$2 AND ea.is_submitted=true
     ORDER BY ea.total_marks DESC`,
    [req.params.examId, req.schoolId]
  );

  const avg = rows.reduce((s, r) => s + parseFloat(r.percentage||0), 0) / (rows.length||1);
  const highest = rows[0]?.percentage || 0;
  const passed = rows.filter(r => parseFloat(r.percentage||0) >= 50).length;

  res.json({
    results: rows,
    stats: {
      totalAttempts: rows.length,
      averageScore: avg.toFixed(1),
      highestScore: parseFloat(highest).toFixed(1),
      passCount: passed,
      passRate: rows.length ? ((passed/rows.length)*100).toFixed(1) : 0,
    },
  });
};

module.exports = { getOnlineExams, createOnlineExam, startExam, saveProgress, submitExam, getExamResults };
