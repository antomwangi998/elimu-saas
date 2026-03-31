// ============================================================
// AI Analytics Engine
// Statistical ML for student performance prediction,
// at-risk detection, fee default patterns, actionable insights
// No external ML dependencies - pure statistical modeling
// ============================================================
const { query, withTransaction } = require('../config/database');
const { cache } = require('../config/redis');
const logger = require('../config/logger');

// ── Scoring weights ───────────────────────────────────────────
const WEIGHTS = {
  attendance:        0.30,
  academic:          0.35,
  fee_compliance:    0.20,
  behavior:          0.10,
  improvement_trend: 0.05,
};

// ── Risk thresholds ───────────────────────────────────────────
const RISK = {
  HIGH:   { min: 0.65, label: 'high_risk',    colour: '#e53e3e' },
  MEDIUM: { min: 0.40, label: 'medium_risk',  colour: '#dd6b20' },
  LOW:    { min: 0.00, label: 'low_risk',     colour: '#38a169' },
};

const getRiskLabel = (score) => {
  if (score >= RISK.HIGH.min) return RISK.HIGH;
  if (score >= RISK.MEDIUM.min) return RISK.MEDIUM;
  return RISK.LOW;
};

// ============================================================
// CORE PREDICTION ENGINE
// ============================================================

const predictStudentRisk = async (studentId, schoolId) => {
  const cacheKey = `ai:risk:${studentId}`;
  const cached = await cache.get(cacheKey).catch(() => null);
  if (cached) return cached;

  // ── 1. Attendance score ───────────────────────────────────
  const { rows: attRows } = await query(
    `SELECT
       COUNT(*) as total,
       COUNT(*) FILTER (WHERE status='present') as present,
       COUNT(*) FILTER (WHERE status='absent') as absent,
       COUNT(*) FILTER (WHERE status='late') as late,
       COUNT(*) FILTER (WHERE date >= NOW()-INTERVAL '14 days' AND status='absent') as recent_absences
     FROM attendance_records
     WHERE student_id=$1 AND school_id=$2`,
    [studentId, schoolId]
  );
  const att = attRows[0];
  const attRate = att.total > 0 ? parseInt(att.present) / parseInt(att.total) : 1;
  const attRisk = 1 - attRate + (parseInt(att.recent_absences) * 0.05);
  const attendanceScore = Math.min(1, attRisk);

  // ── 2. Academic score ─────────────────────────────────────
  const { rows: markRows } = await query(
    `SELECT AVG(sm.marks) as avg_marks, AVG(sm.points) as avg_points,
            COUNT(*) FILTER (WHERE sm.marks < 50) as fails,
            COUNT(*) as total_papers
     FROM student_marks sm
     WHERE sm.student_id=$1 AND sm.school_id=$2 AND sm.is_absent=false`,
    [studentId, schoolId]
  );
  const marks = markRows[0];
  const avgMarks = parseFloat(marks.avg_marks || 50);
  const failRate = marks.total_papers > 0 ? parseInt(marks.fails) / parseInt(marks.total_papers) : 0;
  const academicRisk = Math.max(0, (50 - avgMarks) / 50) * 0.6 + failRate * 0.4;
  const academicScore = Math.min(1, academicRisk);

  // ── 3. Fee compliance score ───────────────────────────────
  const { rows: feeRows } = await query(
    `SELECT
       COALESCE(SUM(sfa.net_fees),0) as expected,
       COALESCE((SELECT SUM(fp.amount) FROM fee_payments fp
                 WHERE fp.student_id=$1 AND fp.status='completed'),0) as paid
     FROM student_fee_assignments sfa WHERE sfa.student_id=$1`,
    [studentId]
  );
  const fee = feeRows[0];
  const expected = parseFloat(fee.expected || 0);
  const paid = parseFloat(fee.paid || 0);
  const feeRisk = expected > 0 ? Math.max(0, (expected - paid) / expected) : 0;
  const feeScore = Math.min(1, feeRisk);

  // ── 4. Behavior score ─────────────────────────────────────
  const { rows: discRows } = await query(
    `SELECT COUNT(*) as total,
            COUNT(*) FILTER (WHERE severity IN ('serious','critical')) as serious,
            COUNT(*) FILTER (WHERE created_at >= NOW()-INTERVAL '30 days') as recent
     FROM discipline_incidents
     WHERE student_id=$1 AND school_id=$2`,
    [studentId, schoolId]
  );
  const disc = discRows[0];
  const behaviorRisk = Math.min(1,
    parseInt(disc.serious) * 0.25 +
    parseInt(disc.recent) * 0.15 +
    parseInt(disc.total) * 0.05
  );
  const behaviorScore = behaviorRisk;

  // ── 5. Improvement trend (last 3 exam series) ─────────────
  const { rows: trendRows } = await query(
    `SELECT AVG(sm.points) as avg_pts, es.created_at
     FROM student_marks sm
     JOIN exam_papers ep ON sm.exam_paper_id=ep.id
     JOIN exam_series es ON ep.exam_series_id=es.id
     WHERE sm.student_id=$1 AND sm.school_id=$2 AND sm.is_absent=false
     GROUP BY es.id ORDER BY es.created_at DESC LIMIT 3`,
    [studentId, schoolId]
  );
  let trendRisk = 0.3; // neutral if no data
  if (trendRows.length >= 2) {
    const latest = parseFloat(trendRows[0].avg_pts || 0);
    const older = parseFloat(trendRows[trendRows.length - 1].avg_pts || 0);
    const change = latest - older;
    trendRisk = change > 0 ? Math.max(0, 0.3 - change * 0.05) : Math.min(1, 0.3 + Math.abs(change) * 0.08);
  }

  // ── Composite risk score ──────────────────────────────────
  const riskScore =
    attendanceScore   * WEIGHTS.attendance +
    academicScore     * WEIGHTS.academic +
    feeScore          * WEIGHTS.fee_compliance +
    behaviorScore     * WEIGHTS.behavior +
    trendRisk         * WEIGHTS.improvement_trend;

  const riskInfo = getRiskLabel(riskScore);

  // ── Build factors list ────────────────────────────────────
  const factors = [
    { factor: 'Attendance Rate', weight: WEIGHTS.attendance, value: `${(attRate * 100).toFixed(1)}%`, risk: attendanceScore },
    { factor: 'Academic Performance', weight: WEIGHTS.academic, value: `${avgMarks.toFixed(1)} marks avg`, risk: academicScore },
    { factor: 'Fee Compliance', weight: WEIGHTS.fee_compliance, value: `${((paid/Math.max(expected,1))*100).toFixed(1)}% paid`, risk: feeScore },
    { factor: 'Behavior Record', weight: WEIGHTS.behavior, value: `${disc.total} incidents`, risk: behaviorScore },
    { factor: 'Performance Trend', weight: WEIGHTS.improvement_trend, value: trendRows.length >= 2 ? (parseFloat(trendRows[0].avg_pts) > parseFloat(trendRows[trendRows.length-1].avg_pts) ? 'Improving' : 'Declining') : 'Insufficient data', risk: trendRisk },
  ].sort((a, b) => b.risk - a.risk);

  // ── Generate human recommendation ────────────────────────
  const topFactor = factors[0];
  const recs = {
    attendance: 'Frequent absences detected. Contact parent immediately and arrange a welfare check.',
    academic:   'Academic performance is below expectations. Recommend extra tuition and close monitoring by class teacher.',
    fee_compliance: 'Outstanding fee balance is high. Arrange a parent meeting through the bursar.',
    behavior:   'Multiple disciplinary incidents recorded. Refer to counsellor and Dean of Studies.',
    improvement_trend: 'Performance is declining across terms. Immediate academic intervention required.',
  };
  const recKey = Object.keys(WEIGHTS).find(k => topFactor.factor.toLowerCase().includes(k.split('_')[0]));
  const recommendation = recs[recKey] || 'Monitor this student closely and involve parents.';

  const result = {
    studentId,
    riskScore: parseFloat(riskScore.toFixed(4)),
    riskLabel: riskInfo.label,
    riskColour: riskInfo.colour,
    factors,
    recommendation,
    details: {
      attendanceRate: (attRate * 100).toFixed(1),
      avgMarks: avgMarks.toFixed(1),
      feeBalance: (expected - paid).toFixed(2),
      incidentCount: parseInt(disc.total),
      recentAbsences: parseInt(att.recent_absences),
    },
    generatedAt: new Date().toISOString(),
  };

  await cache.set(cacheKey, result, 3600).catch(() => {}); // cache 1 hour
  return result;
};

// ── Fee default prediction ────────────────────────────────────
const predictFeeDefault = async (studentId, schoolId) => {
  const { rows } = await query(
    `SELECT
       COUNT(fp.id) as payment_count,
       AVG(EXTRACT(DAY FROM (fp.created_at - fp.payment_date))) as avg_delay_days,
       MAX(EXTRACT(DAY FROM NOW() - fp.payment_date)) as max_overdue,
       (SELECT SUM(sfa.net_fees) - COALESCE(SUM(fp2.amount),0)
        FROM student_fee_assignments sfa
        LEFT JOIN fee_payments fp2 ON fp2.student_id=$1 AND fp2.status='completed'
        WHERE sfa.student_id=$1) as current_balance
     FROM fee_payments fp WHERE fp.student_id=$1 AND fp.school_id=$2 AND fp.status='completed'`,
    [studentId, schoolId]
  );
  const data = rows[0];
  const balance = parseFloat(data.current_balance || 0);
  const defaultScore = balance > 50000 ? 0.85 : balance > 20000 ? 0.6 : balance > 5000 ? 0.35 : 0.1;

  return {
    defaultScore,
    defaultLikelihood: getRiskLabel(defaultScore).label,
    currentBalance: balance,
    paymentCount: parseInt(data.payment_count || 0),
  };
};

// ============================================================
// SCHOOL-WIDE AI INSIGHTS GENERATOR
// ============================================================

const generateSchoolInsights = async (schoolId) => {
  const insights = [];

  // ── Insight 1: Chronic absentees ─────────────────────────
  const { rows: chronic } = await query(
    `SELECT s.first_name||' '||s.last_name as name, c.name as class_name,
            COUNT(ar.id) FILTER (WHERE ar.status='absent') as absences
     FROM students s
     JOIN attendance_records ar ON ar.student_id=s.id AND ar.school_id=$1
     LEFT JOIN classes c ON s.current_class_id=c.id
     WHERE s.school_id=$1 AND s.is_active=true
       AND ar.date >= NOW()-INTERVAL '30 days'
     GROUP BY s.id, c.name HAVING COUNT(ar.id) FILTER (WHERE ar.status='absent') >= 5
     ORDER BY absences DESC LIMIT 20`,
    [schoolId]
  );
  if (chronic.length > 0) {
    insights.push({
      school_id: schoolId,
      insight_type: 'chronic_absenteeism',
      title: `${chronic.length} Students with Chronic Absenteeism`,
      description: `${chronic.length} students have missed 5+ days in the last 30 days. Top: ${chronic.slice(0,3).map(s => s.name).join(', ')}.`,
      severity: chronic.length > 10 ? 'critical' : 'warning',
      affected_entity_type: 'student',
      data: JSON.stringify({ students: chronic }),
      action_url: '/register/absentees',
    });
  }

  // ── Insight 2: Fee collection alert ──────────────────────
  const { rows: feeStatus } = await query(
    `SELECT
       COALESCE(SUM(sfa.net_fees),0) as expected,
       COALESCE((SELECT SUM(fp.amount) FROM fee_payments fp WHERE fp.school_id=$1 AND fp.status='completed'),0) as collected
     FROM student_fee_assignments sfa
     JOIN students s ON sfa.student_id=s.id WHERE s.school_id=$1 AND s.is_active=true`,
    [schoolId]
  );
  const fe = feeStatus[0];
  const collRate = fe.expected > 0 ? (parseFloat(fe.collected) / parseFloat(fe.expected)) * 100 : 100;
  if (collRate < 60) {
    insights.push({
      school_id: schoolId,
      insight_type: 'fee_collection_low',
      title: `Fee Collection at ${collRate.toFixed(1)}% — Below Target`,
      description: `Only ${collRate.toFixed(1)}% of expected fees collected. Outstanding: KES ${(parseFloat(fe.expected) - parseFloat(fe.collected)).toLocaleString()}.`,
      severity: collRate < 40 ? 'critical' : 'warning',
      affected_entity_type: 'school',
      data: JSON.stringify({ collRate, expected: fe.expected, collected: fe.collected }),
      action_url: '/fees/defaulters',
    });
  }

  // ── Insight 3: Subject performance anomaly ────────────────
  const { rows: weakSubjects } = await query(
    `SELECT sub.name as subject, ROUND(AVG(sm.marks),1) as avg_marks, c.level
     FROM student_marks sm
     JOIN exam_papers ep ON sm.exam_paper_id=ep.id
     JOIN subjects sub ON ep.subject_id=sub.id
     JOIN classes c ON ep.class_id=c.id
     WHERE sm.school_id=$1 AND sm.is_absent=false
     GROUP BY sub.id, c.level HAVING AVG(sm.marks) < 45
     ORDER BY avg_marks ASC LIMIT 5`,
    [schoolId]
  );
  if (weakSubjects.length > 0) {
    insights.push({
      school_id: schoolId,
      insight_type: 'weak_subjects',
      title: `${weakSubjects.length} Subject(s) with Average Below 45%`,
      description: `${weakSubjects.map(s => `${s.subject} (Form ${s.level}: ${s.avg_marks}%)`).join(', ')} need urgent attention.`,
      severity: 'warning',
      affected_entity_type: 'subject',
      data: JSON.stringify(weakSubjects),
      action_url: '/analytics/subject-performance',
    });
  }

  // ── Insight 4: Timetable lesson compliance ────────────────
  const { rows: missedLessons } = await query(
    `SELECT u.first_name||' '||u.last_name as teacher_name,
            COUNT(*) FILTER (WHERE la.was_present=false) as missed,
            COUNT(*) as total
     FROM lesson_attendance la
     JOIN users u ON la.teacher_id=u.id
     WHERE la.school_id=$1 AND la.lesson_date >= NOW()-INTERVAL '7 days'
     GROUP BY u.id HAVING COUNT(*) FILTER (WHERE la.was_present=false) >= 2
     ORDER BY missed DESC LIMIT 5`,
    [schoolId]
  );
  if (missedLessons.length > 0) {
    insights.push({
      school_id: schoolId,
      insight_type: 'teacher_absenteeism',
      title: `${missedLessons.length} Teacher(s) Missed 2+ Lessons This Week`,
      description: `${missedLessons.map(t => t.teacher_name).join(', ')} have missed lessons. Immediate action required.`,
      severity: 'warning',
      affected_entity_type: 'staff',
      data: JSON.stringify(missedLessons),
      action_url: '/timetable/lesson-attendance',
    });
  }

  // ── Insight 5: Exam submission progress ──────────────────
  const { rows: pendingExams } = await query(
    `SELECT es.name,
            COUNT(ep.id) as total,
            COUNT(ep.id) FILTER (WHERE ep.is_submitted=false) as pending
     FROM exam_series es
     JOIN exam_papers ep ON ep.exam_series_id=es.id
     WHERE es.school_id=$1 AND es.is_locked=false
       AND es.end_date < NOW() AND es.end_date IS NOT NULL
     GROUP BY es.id HAVING COUNT(ep.id) FILTER (WHERE ep.is_submitted=false) > 0`,
    [schoolId]
  );
  if (pendingExams.length > 0) {
    insights.push({
      school_id: schoolId,
      insight_type: 'overdue_marks',
      title: `Marks Not Submitted for ${pendingExams.length} Exam Series`,
      description: pendingExams.map(e => `${e.name}: ${e.pending}/${e.total} papers pending`).join('; '),
      severity: 'critical',
      affected_entity_type: 'exam',
      data: JSON.stringify(pendingExams),
      action_url: '/exams',
    });
  }

  // ── Save insights to DB ───────────────────────────────────
  await withTransaction(async (client) => {
    // Clear old non-dismissed insights
    await client.query(
      `DELETE FROM ai_insights WHERE school_id=$1 AND is_dismissed=false
       AND generated_at < NOW()-INTERVAL '24 hours'`,
      [schoolId]
    );
    for (const ins of insights) {
      await client.query(
        `INSERT INTO ai_insights(school_id, insight_type, title, description, severity,
           affected_entity_type, data, action_url)
         VALUES($1,$2,$3,$4,$5,$6,$7::jsonb,$8)`,
        [ins.school_id, ins.insight_type, ins.title, ins.description,
         ins.severity, ins.affected_entity_type, ins.data, ins.action_url]
      );
    }
  }).catch(e => logger.warn('Insight save error:', e.message));

  return insights;
};

// ============================================================
// PERSONALIZED AUTO-COMMENT ENGINE (UPGRADE)
// Generates human-like, specific, personalized comments
// ============================================================
const generatePersonalizedComment = async (studentId, schoolId, examSeriesId) => {
  // Get student data
  const [marksRes, attRes, discRes, trendRes, prevCommentsRes] = await Promise.allSettled([
    query(
      `SELECT AVG(sm.marks) as avg_marks, AVG(sm.points) as avg_points,
              MAX(sm.marks) as best_marks, MIN(sm.marks) FILTER (WHERE sm.is_absent=false) as worst_marks,
              COUNT(sm.id) as total_subjects,
              sub.name as best_subject
       FROM student_marks sm
       JOIN exam_papers ep ON sm.exam_paper_id=ep.id
       LEFT JOIN subjects sub ON ep.subject_id=sub.id
       WHERE sm.student_id=$1 AND ep.exam_series_id=$2 AND sm.is_absent=false
       GROUP BY sub.name ORDER BY AVG(sm.marks) DESC LIMIT 1`,
      [studentId, examSeriesId]
    ),
    query(
      `SELECT ROUND(100.0*COUNT(*) FILTER (WHERE status='present')/NULLIF(COUNT(*),0),1) as rate,
              COUNT(*) FILTER (WHERE status='absent') as absences
       FROM attendance_records WHERE student_id=$1 AND school_id=$2`,
      [studentId, schoolId]
    ),
    query(
      'SELECT COUNT(*) as total FROM discipline_incidents WHERE student_id=$1 AND school_id=$2 AND resolved=false',
      [studentId, schoolId]
    ),
    query(
      `SELECT AVG(sm.points) as avg_pts FROM student_marks sm
       JOIN exam_papers ep ON sm.exam_paper_id=ep.id
       JOIN exam_series es ON ep.exam_series_id=es.id
       WHERE sm.student_id=$1 AND sm.school_id=$2 AND sm.is_absent=false
         AND es.id != $3
       GROUP BY es.created_at ORDER BY es.created_at DESC LIMIT 1`,
      [studentId, schoolId, examSeriesId]
    ),
    query(
      `SELECT s.first_name, s.gender FROM students s WHERE s.id=$1`, [studentId]
    ),
  ]);

  const marks   = marksRes.status === 'fulfilled' ? marksRes.value.rows[0] : null;
  const att     = attRes.status === 'fulfilled' ? attRes.value.rows[0] : null;
  const disc    = discRes.status === 'fulfilled' ? discRes.value.rows[0] : null;
  const prevMark = trendRes.status === 'fulfilled' ? trendRes.value.rows[0] : null;
  const student = prevCommentsRes.status === 'fulfilled' ? prevCommentsRes.value.rows[0] : null;

  const avgMarks   = parseFloat(marks?.avg_marks || 0);
  const avgPoints  = parseFloat(marks?.avg_points || 0);
  const attRate    = parseFloat(att?.rate || 100);
  const incidents  = parseInt(disc?.total || 0);
  const prevPts    = parseFloat(prevMark?.avg_pts || avgPoints);
  const improved   = avgPoints > prevPts;
  const pronoun    = student?.gender === 'female' ? 'She' : 'He';
  const name       = student?.first_name || 'The student';
  const bestSubj   = marks?.best_subject;

  // Build contextual, human-like comment
  const parts = [];

  // Academic performance part
  if (avgMarks >= 75) {
    parts.push(`${name} has demonstrated exceptional academic ability this term, achieving an outstanding mean score of ${avgMarks.toFixed(1)}%.`);
    if (bestSubj) parts.push(`${pronoun} excelled particularly in ${bestSubj}.`);
  } else if (avgMarks >= 60) {
    parts.push(`${name} has shown commendable effort and achieved a good mean score of ${avgMarks.toFixed(1)}% this term.`);
    if (bestSubj) parts.push(`${pronoun} performed best in ${bestSubj} and should use this strength to lift weaker subjects.`);
  } else if (avgMarks >= 45) {
    parts.push(`${name} achieved an average mean score of ${avgMarks.toFixed(1)}% this term. There is clear potential that needs to be nurtured with more consistent effort.`);
  } else if (avgMarks >= 30) {
    parts.push(`${name} scored a mean of ${avgMarks.toFixed(1)}% this term, which is below expectations. A concerted effort is urgently needed.`);
  } else {
    parts.push(`${name}'s mean score of ${avgMarks.toFixed(1)}% is a cause for concern and requires immediate parental involvement and academic intervention.`);
  }

  // Trend part
  if (prevMark) {
    if (improved) {
      parts.push(`This represents an improvement from the previous assessment — a commendable step forward that should be sustained.`);
    } else if (avgPoints < prevPts - 1) {
      parts.push(`This is a decline from the previous examination. ${name} must identify and address the areas of weakness without delay.`);
    }
  }

  // Attendance part
  if (attRate >= 95) {
    parts.push(`${pronoun} has maintained exemplary attendance at ${attRate}%, which is greatly appreciated.`);
  } else if (attRate >= 80) {
    parts.push(`${pronoun} has generally been present (${attRate}% attendance), though punctuality and consistency should be improved.`);
  } else if (attRate < 80) {
    parts.push(`${pronoun} has missed a significant number of school days (${att?.absences} absences, ${attRate}% rate), which is directly impacting academic performance.`);
  }

  // Behavior part
  if (incidents > 3) {
    parts.push(`${name} has also had repeated disciplinary issues this term. Parents are urged to reinforce the importance of good conduct at home.`);
  } else if (incidents === 0 && avgMarks >= 60) {
    parts.push(`${pronoun} has maintained excellent conduct throughout the term.`);
  }

  // Closing advice
  if (avgMarks >= 75) {
    parts.push(`Keep up the excellent work and aim for the top position next term!`);
  } else if (avgMarks >= 50) {
    parts.push(`With focused revision, active participation in class, and timely completion of assignments, ${name} can achieve significantly better results next term.`);
  } else {
    parts.push(`We strongly recommend daily revision, attendance of all lessons, and regular communication between parent and class teacher to support ${name}'s academic recovery.`);
  }

  return parts.join(' ');
};

// ============================================================
// API HANDLER FUNCTIONS
// ============================================================

// GET /api/ai/predictions/school — bulk generate for all students
const generateSchoolPredictions = async (req, res) => {
  const { rows: students } = await query(
    'SELECT id FROM students WHERE school_id=$1 AND is_active=true LIMIT 200',
    [req.schoolId]
  );

  const predictions = [];
  for (const student of students) {
    try {
      const pred = await predictStudentRisk(student.id, req.schoolId);
      await query(
        `INSERT INTO ai_predictions(school_id, student_id, prediction_type, risk_score, prediction_label, factors, recommendation, expires_at)
         VALUES($1,$2,'at_risk',$3,$4,$5::jsonb,$6,NOW()+INTERVAL '24 hours')
         ON CONFLICT(student_id, prediction_type, model_version) DO UPDATE SET
           risk_score=$3, prediction_label=$4, factors=$5::jsonb, recommendation=$6,
           generated_at=NOW(), expires_at=NOW()+INTERVAL '24 hours'`,
        [req.schoolId, student.id, pred.riskScore, pred.riskLabel, JSON.stringify(pred.factors), pred.recommendation]
      );
      predictions.push({ studentId: student.id, ...pred });
    } catch (e) {
      logger.warn(`Prediction failed for student ${student.id}:`, e.message);
    }
  }

  const highRisk = predictions.filter(p => p.riskLabel === 'high_risk').length;
  res.json({
    total: predictions.length,
    highRisk, mediumRisk: predictions.filter(p => p.riskLabel === 'medium_risk').length,
    lowRisk: predictions.filter(p => p.riskLabel === 'low_risk').length,
    predictions: predictions.slice(0, 50),
  });
};

// GET /api/ai/predictions/at-risk — get at-risk students
const getAtRiskStudents = async (req, res) => {
  const { level = 'high_risk', classId } = req.query;
  const { rows } = await query(
    `SELECT ap.*, s.first_name, s.last_name, s.admission_number, s.photo_url,
            c.name as class_name, c.level
     FROM ai_predictions ap
     JOIN students s ON ap.student_id=s.id
     LEFT JOIN classes c ON s.current_class_id=c.id
     WHERE ap.school_id=$1 AND ap.prediction_type='at_risk'
       AND ap.prediction_label=$2
       ${classId ? 'AND s.current_class_id=$3' : ''}
       AND ap.expires_at > NOW()
     ORDER BY ap.risk_score DESC`,
    [req.schoolId, level, ...(classId ? [classId] : [])]
  );
  res.json(rows);
};

// GET /api/ai/insights — get school insights
const getSchoolInsights = async (req, res) => {
  const { rows } = await query(
    `SELECT * FROM ai_insights
     WHERE school_id=$1 AND is_dismissed=false
     ORDER BY CASE severity WHEN 'critical' THEN 1 WHEN 'warning' THEN 2 ELSE 3 END, generated_at DESC`,
    [req.schoolId]
  );
  res.json(rows);
};

// POST /api/ai/insights/generate — trigger insight generation
const triggerInsightGeneration = async (req, res) => {
  const insights = await generateSchoolInsights(req.schoolId);
  res.json({ generated: insights.length, insights });
};

// PUT /api/ai/insights/:id/dismiss
const dismissInsight = async (req, res) => {
  await query('UPDATE ai_insights SET is_dismissed=true WHERE id=$1 AND school_id=$2', [req.params.id, req.schoolId]);
  res.json({ message: 'Insight dismissed' });
};

// GET /api/ai/comment/:studentId — generate personalized comment
const getPersonalizedComment = async (req, res) => {
  const { examSeriesId } = req.query;
  if (!examSeriesId) return res.status(400).json({ error: 'examSeriesId required' });
  const comment = await generatePersonalizedComment(req.params.studentId, req.schoolId, examSeriesId);
  res.json({ comment, studentId: req.params.studentId });
};

// GET /api/ai/performance-trends/:classId
const getPerformanceTrends = async (req, res) => {
  const { rows: trends } = await query(
    `SELECT es.name as exam_name, es.type, es.created_at,
            ROUND(AVG(sm.marks),1) as avg_marks,
            ROUND(AVG(sm.points),2) as avg_points,
            COUNT(DISTINCT sm.student_id) as students,
            COUNT(sm.id) FILTER (WHERE sm.marks >= 50) as passes,
            COUNT(sm.id) FILTER (WHERE sm.marks < 50 AND sm.is_absent=false) as fails
     FROM exam_series es
     JOIN exam_papers ep ON ep.exam_series_id=es.id
     JOIN student_marks sm ON sm.exam_paper_id=ep.id
     WHERE es.school_id=$1 AND ep.class_id=$2 AND sm.is_absent=false
     GROUP BY es.id ORDER BY es.created_at`,
    [req.schoolId, req.params.classId]
  );

  const { rows: subjectTrends } = await query(
    `SELECT sub.name as subject, sub.code,
            ROUND(AVG(sm.marks),1) as avg_marks,
            COUNT(sm.id) FILTER (WHERE sm.marks >= 50) as passes,
            COUNT(sm.id) as total
     FROM student_marks sm
     JOIN exam_papers ep ON sm.exam_paper_id=ep.id
     JOIN subjects sub ON ep.subject_id=sub.id
     JOIN exam_series es ON ep.exam_series_id=es.id
     WHERE sm.school_id=$1 AND ep.class_id=$2 AND sm.is_absent=false
       AND es.created_at >= NOW()-INTERVAL '1 year'
     GROUP BY sub.id ORDER BY avg_marks DESC`,
    [req.schoolId, req.params.classId]
  );

  res.json({ examTrends: trends, subjectTrends });
};

// GET /api/ai/fee-defaulters-prediction
const getFeeDefaulterPredictions = async (req, res) => {
  const { rows: students } = await query(
    `SELECT DISTINCT s.id, s.first_name, s.last_name, s.admission_number,
            c.name as class_name, sp.phone as parent_phone
     FROM students s
     JOIN student_fee_assignments sfa ON sfa.student_id=s.id
     LEFT JOIN classes c ON s.current_class_id=c.id
     LEFT JOIN student_parents sp ON sp.student_id=s.id AND sp.is_primary=true
     WHERE s.school_id=$1 AND s.is_active=true
       AND sfa.net_fees > COALESCE(
         (SELECT SUM(fp.amount) FROM fee_payments fp WHERE fp.student_id=s.id AND fp.status='completed'),0
       ) + 5000`,
    [req.schoolId]
  );

  const results = [];
  for (const student of students.slice(0, 100)) {
    const prediction = await predictFeeDefault(student.id, req.schoolId);
    results.push({ ...student, ...prediction });
  }

  results.sort((a, b) => b.defaultScore - a.defaultScore);
  res.json(results);
};

module.exports = {
  predictStudentRisk, generateSchoolInsights, generatePersonalizedComment,
  generateSchoolPredictions, getAtRiskStudents,
  getSchoolInsights, triggerInsightGeneration, dismissInsight,
  getPersonalizedComment, getPerformanceTrends, getFeeDefaulterPredictions,
};
