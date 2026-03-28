// ============================================================
// Analytics Controller — Dashboard, Trends, AI, Risk
// ============================================================
const { query } = require('../config/database');
const { cache } = require('../config/redis');

const getDashboardStats = async (req, res) => {
  try {
    const schoolId = req.schoolId;
    const cacheKey = `dashboard:${schoolId}`;
    const cached = await cache.get(cacheKey);
    if (cached) return res.json(cached);

    const [students, staff, fees, attendance, exams] = await Promise.all([
      query(`SELECT COUNT(*) FILTER (WHERE is_active) as total,
               COUNT(*) FILTER (WHERE is_active AND gender='male') as boys,
               COUNT(*) FILTER (WHERE is_active AND gender='female') as girls,
               COUNT(*) FILTER (WHERE is_boarding AND is_active) as boarding
             FROM students WHERE school_id=$1`, [schoolId]),
      query(`SELECT COUNT(*) FILTER (WHERE is_active) as total FROM staff WHERE school_id=$1`, [schoolId]),
      query(`SELECT COALESCE(SUM(fp.amount),0) as total_collected,
               COUNT(DISTINCT fp.student_id) as students_who_paid,
               COUNT(fp.id) as transaction_count,
               COALESCE(AVG(fp.amount),0) as avg_payment,
               COALESCE(SUM(fp.amount) FILTER (WHERE fp.payment_method IN ('mpesa_stk','mpesa_paybill')),0) as mpesa_amount,
               COALESCE(SUM(fp.amount) FILTER (WHERE fp.payment_method='cash'),0) as cash_amount,
               COALESCE(SUM(fp.amount) FILTER (WHERE fp.payment_method='bank_transfer'),0) as bank_amount
             FROM fee_payments fp WHERE fp.school_id=$1 AND fp.status='completed'
             AND fp.payment_date >= DATE_TRUNC('month', NOW())`, [schoolId]),
      query(`SELECT COUNT(*) FILTER (WHERE date=CURRENT_DATE) as today_total,
               COUNT(*) FILTER (WHERE date=CURRENT_DATE AND status='present') as today_present,
               COUNT(*) FILTER (WHERE date=CURRENT_DATE AND status='absent') as today_absent
             FROM attendance_records WHERE school_id=$1`, [schoolId]),
      query(`SELECT COUNT(*) as total_series,
               COUNT(*) FILTER (WHERE is_locked) as locked,
               COUNT(*) FILTER (WHERE is_locked) as published
             FROM exam_series WHERE school_id=$1`, [schoolId]),
    ]);

    const { rows: recentPayments } = await query(`
      SELECT fp.receipt_number, fp.amount, fp.payment_method, fp.payment_date,
             s.first_name || ' ' || s.last_name as student_name
      FROM fee_payments fp JOIN students s ON fp.student_id=s.id
      WHERE fp.school_id=$1 AND fp.status='completed'
      ORDER BY fp.created_at DESC LIMIT 8`, [schoolId]);

    const { rows: attendanceTrend } = await query(`
      SELECT date::text,
             COUNT(*) FILTER (WHERE status='present') as present,
             COUNT(*) as total
      FROM attendance_records WHERE school_id=$1 AND date >= NOW()-INTERVAL '7 days'
      GROUP BY date ORDER BY date`, [schoolId]);

    const { rows: feeTrend } = await query(`
      SELECT TO_CHAR(payment_date,'Mon YYYY') as month,
             SUM(amount) as collected, COUNT(*) as transactions
      FROM fee_payments WHERE school_id=$1 AND status='completed'
      AND payment_date >= NOW()-INTERVAL '6 months'
      GROUP BY TO_CHAR(payment_date,'Mon YYYY'), DATE_TRUNC('month',payment_date)
      ORDER BY DATE_TRUNC('month',payment_date)`, [schoolId]);

    const { rows: topStudents } = await query(`
      SELECT s.first_name || ' ' || s.last_name as name, c.name as class_name,
             ROUND(AVG(sm.marks) FILTER (WHERE NOT sm.is_absent AND sm.marks IS NOT NULL), 2) as avg_marks
      FROM students s JOIN classes c ON c.id = s.current_class_id
      JOIN student_marks sm ON sm.student_id = s.id
      WHERE s.school_id=$1 AND s.is_active=true
      GROUP BY s.id, c.name HAVING COUNT(sm.id) > 0
      ORDER BY avg_marks DESC NULLS LAST LIMIT 5`, [schoolId]);

    const stats = {
      students: students.rows[0], staff: staff.rows[0], fees: fees.rows[0],
      attendance: attendance.rows[0], exams: exams.rows[0],
      recentPayments, topStudents,
      charts: { attendanceTrend, feeTrend },
    };

    await cache.set(cacheKey, stats, 120);
    res.json(stats);
  } catch (e) { res.status(500).json({ error: e.message }); }
};

const getAcademicAnalytics = async (req, res) => {
  try {
    const { examSeriesId, classId } = req.query;
    if (!examSeriesId) return res.status(400).json({ error: 'examSeriesId required' });

    const params = [examSeriesId, req.schoolId];
    const classFilter = classId ? ` AND ep.class_id=$3` : '';
    if (classId) params.push(classId);

    const [gradeDist, subjectPerf, gender, trend] = await Promise.all([
      query(`SELECT sm.grade, COUNT(*) as count,
               ROUND(COUNT(*)*100.0/NULLIF(SUM(COUNT(*)) OVER(),0),1) as percentage
             FROM student_marks sm JOIN exam_papers ep ON sm.exam_paper_id=ep.id
             WHERE ep.exam_series_id=$1 AND ep.school_id=$2 ${classFilter}
             AND sm.grade IS NOT NULL
             GROUP BY sm.grade ORDER BY sm.grade`, params),
      query(`SELECT sub.name, sub.code,
               ROUND(AVG(sm.marks) FILTER (WHERE NOT sm.is_absent),2) as avg_marks,
               COUNT(sm.id) FILTER (WHERE sm.marks>=50 AND NOT sm.is_absent) as pass_count,
               COUNT(sm.id) FILTER (WHERE NOT sm.is_absent) as total_sat
             FROM exam_papers ep JOIN subjects sub ON sub.id=ep.subject_id
             JOIN student_marks sm ON sm.exam_paper_id=ep.id
             WHERE ep.exam_series_id=$1 AND ep.school_id=$2 ${classFilter}
             GROUP BY sub.id ORDER BY avg_marks DESC NULLS LAST`, params),
      query(`SELECT s.gender,
               ROUND(AVG(sm.marks) FILTER (WHERE NOT sm.is_absent),2) as avg_marks,
               COUNT(DISTINCT s.id) as student_count
             FROM students s JOIN student_marks sm ON sm.student_id=s.id
             JOIN exam_papers ep ON sm.exam_paper_id=ep.id
             WHERE ep.exam_series_id=$1 AND ep.school_id=$2 ${classFilter}
             GROUP BY s.gender`, params),
      query(`SELECT es2.name, es2.start_date,
               ROUND(AVG(sm2.marks) FILTER (WHERE NOT sm2.is_absent),2) as avg_marks
             FROM exam_series es2 JOIN exam_papers ep2 ON ep2.exam_series_id=es2.id
             JOIN student_marks sm2 ON sm2.exam_paper_id=ep2.id
             WHERE es2.school_id=$1 AND ep2.class_id IS NOT NULL
             ${classId ? 'AND ep2.class_id=$2' : ''}
             GROUP BY es2.id ORDER BY es2.start_date DESC LIMIT 8`,
             classId ? [req.schoolId, classId] : [req.schoolId]),
    ]);

    res.json({
      gradeDistribution: gradeDist.rows,
      subjectPerformance: subjectPerf.rows,
      genderComparison: gender.rows,
      examTrends: trend.rows.reverse(),
    });
  } catch (e) { res.status(500).json({ error: e.message }); }
};

const getPerformanceTrends = async (req, res) => {
  try {
    const { classId } = req.params;
    const { rows: examTrends } = await query(`
      SELECT es.id as exam_id, es.name as exam_name, es.type as exam_type, es.start_date,
             ROUND(AVG(sm.marks) FILTER (WHERE NOT sm.is_absent AND sm.marks IS NOT NULL), 2) as avg_marks,
             ROUND(AVG(sm.points) FILTER (WHERE NOT sm.is_absent), 3) as avg_points,
             COUNT(DISTINCT sm.student_id) as students,
             COUNT(DISTINCT sm.student_id) FILTER (WHERE sm.marks >= 50 AND NOT sm.is_absent) as passes
      FROM exam_series es
      JOIN exam_papers ep ON ep.exam_series_id = es.id AND ep.class_id = $1
      JOIN student_marks sm ON sm.exam_paper_id = ep.id
      WHERE es.school_id = $2 AND es.is_published = true
      GROUP BY es.id ORDER BY es.start_date`, [classId, req.schoolId]);

    res.json({ examTrends });
  } catch (e) { res.status(500).json({ error: e.message }); }
};

const getAtRiskStudents = async (req, res) => {
  try {
    const { level = 'high_risk' } = req.query;
    const { rows: predictions } = await query(`
      SELECT ap.*, s.first_name, s.last_name, s.admission_number,
             c.name as class_name
      FROM ai_predictions ap JOIN students s ON s.id = ap.student_id
      JOIN classes c ON c.id = s.current_class_id
      WHERE ap.school_id=$1 AND ap.prediction_type='risk_assessment'
      AND ($2 = 'all' OR ap.risk_label=$2)
      ORDER BY ap.risk_score DESC LIMIT 100`, [req.schoolId, level])
      .catch(() => ({ rows: [] }));

    if (!predictions.length) {
      // Compute on the fly
      const { rows } = await query(`
        SELECT s.id as student_id, s.first_name, s.last_name, s.admission_number,
               c.name as class_name,
               COALESCE(att.absent_count,0) as absent_count,
               COALESCE(att.total_days,0) as total_days,
               COALESCE(ROUND(100.0*att.absent_count/NULLIF(att.total_days,0),1),0) as absence_rate,
               ROUND(AVG(sm.marks) FILTER (WHERE NOT sm.is_absent), 2) as avg_marks
        FROM students s JOIN classes c ON c.id = s.current_class_id
        LEFT JOIN (
          SELECT student_id, COUNT(*) FILTER (WHERE status='absent') as absent_count, COUNT(*) as total_days
          FROM attendance_records WHERE school_id=$1 GROUP BY student_id
        ) att ON att.student_id = s.id
        LEFT JOIN student_marks sm ON sm.student_id = s.id
        WHERE s.school_id=$1 AND s.is_active=true
        GROUP BY s.id, c.name, att.absent_count, att.total_days
        HAVING COALESCE(att.absent_count,0) >= 5 OR ROUND(AVG(sm.marks) FILTER (WHERE NOT sm.is_absent),2) < 40
        ORDER BY absence_rate DESC, avg_marks ASC LIMIT 50`, [req.schoolId]);

      return res.json(rows.map(r => ({
        ...r,
        risk_score: Math.min(1, (parseFloat(r.absence_rate||0)/100*0.3) + (r.avg_marks ? (100-parseFloat(r.avg_marks))/100*0.35 : 0.35)),
        risk_label: parseFloat(r.absence_rate||0) > 30 || parseFloat(r.avg_marks||100) < 30 ? 'high_risk' : 'medium_risk',
        recommendation: parseFloat(r.absence_rate||0) > 20 ? 'Frequent absences — contact parent immediately' : 'Academic performance needs intervention',
        factors: [
          parseFloat(r.absence_rate||0) > 10 ? { factor: 'High Absenteeism', score: parseFloat(r.absence_rate||0) } : null,
          parseFloat(r.avg_marks||100) < 50 ? { factor: 'Below Average Academic Performance', score: parseFloat(r.avg_marks||0) } : null,
        ].filter(Boolean),
      })));
    }
    res.json(predictions);
  } catch (e) { res.status(500).json({ error: e.message }); }
};

const getFeeDefaultPredictions = async (req, res) => {
  try {
    const { rows } = await query(`
      SELECT s.id as student_id, s.first_name, s.last_name, s.admission_number,
             c.name as class_name,
             COALESCE(sfa.net_fees, 0) as expected_fees,
             COALESCE(SUM(fp.amount) FILTER (WHERE fp.status='completed'), 0) as paid,
             COALESCE(sfa.net_fees,0) - COALESCE(SUM(fp.amount) FILTER (WHERE fp.status='completed'),0) as balance,
             ROUND(100.0 * COALESCE(SUM(fp.amount) FILTER (WHERE fp.status='completed'),0)
               / NULLIF(sfa.net_fees,0), 1) as payment_rate,
             (SELECT phone FROM student_parents WHERE student_id=s.id AND is_primary=true LIMIT 1) as parent_phone
      FROM students s JOIN classes c ON c.id = s.current_class_id
      LEFT JOIN student_fee_assignments sfa ON sfa.student_id=s.id
      LEFT JOIN fee_payments fp ON fp.student_id=s.id
      WHERE s.school_id=$1 AND s.is_active=true
      GROUP BY s.id, c.name, sfa.net_fees
      HAVING COALESCE(sfa.net_fees,0) - COALESCE(SUM(fp.amount) FILTER (WHERE fp.status='completed'),0) > 500
      ORDER BY balance DESC LIMIT 100`, [req.schoolId]);

    const withRisk = rows.map(r => {
      const rate = parseFloat(r.payment_rate || 0);
      const bal  = parseFloat(r.balance || 0);
      const exp  = parseFloat(r.expected_fees || 1);
      const likelihood = bal > exp * 0.7 ? 'high_risk' : bal > exp * 0.3 ? 'medium_risk' : 'low_risk';
      return { ...r, defaultLikelihood: likelihood, currentBalance: r.balance };
    });
    res.json(withRisk);
  } catch (e) { res.status(500).json({ error: e.message }); }
};

const getInsights = async (req, res) => {
  try {
    const { rows } = await query(
      `SELECT * FROM ai_insights WHERE school_id=$1 AND is_dismissed=false
       ORDER BY severity DESC, created_at DESC LIMIT 30`,
      [req.schoolId]
    ).catch(() => ({ rows: [] }));
    res.json(rows);
  } catch (e) { res.json([]); }
};

const generateInsights = async (req, res) => {
  try {
    const schoolId = req.schoolId;
    const insights = [];

    // Low attendance classes
    const { rows: lowAtt } = await query(`
      SELECT c.name, ROUND(100.0 * COUNT(ar.id) FILTER (WHERE ar.status='present') / NULLIF(COUNT(ar.id),0),1) as rate
      FROM classes c LEFT JOIN students s ON s.current_class_id=c.id
      LEFT JOIN attendance_records ar ON ar.student_id=s.id AND ar.date >= NOW()-INTERVAL '14 days'
      WHERE c.school_id=$1 GROUP BY c.id HAVING rate < 70`, [schoolId]).catch(()=>({rows:[]}));
    lowAtt.forEach(r => insights.push({ schoolId, title: `Low Attendance: ${r.name}`,
      description: `${r.name} has only ${r.rate}% attendance in the last 14 days.`,
      severity: r.rate < 50 ? 'critical' : 'warning', category: 'attendance' }));

    // Fee collection
    const { rows: feeStats } = await query(`
      SELECT ROUND(100.0 * COALESCE(SUM(fp.amount),0) / NULLIF(SUM(sfa.net_fees),0),1) as rate
      FROM student_fee_assignments sfa
      LEFT JOIN fee_payments fp ON fp.student_id=sfa.student_id AND fp.status='completed'
      WHERE sfa.school_id=$1`, [schoolId]).catch(()=>({rows:[{rate:0}]}));
    if (parseFloat(feeStats[0]?.rate||0) < 60) {
      insights.push({ schoolId, title: 'Fee Collection Below Target',
        description: `Overall fee collection rate is ${feeStats[0].rate}%. Consider sending reminders.`,
        severity: 'warning', category: 'finance' });
    }

    // Unsubmitted marks
    const { rows: unsubmitted } = await query(`
      SELECT COUNT(*) as count FROM exam_papers ep
      JOIN exam_series es ON es.id = ep.exam_series_id
      WHERE ep.school_id=$1 AND NOT ep.is_submitted AND NOT es.is_locked`, [schoolId]).catch(()=>({rows:[{count:0}]}));
    if (parseInt(unsubmitted[0]?.count||0) > 0) {
      insights.push({ schoolId, title: `${unsubmitted[0].count} Exam Papers Pending`,
        description: `${unsubmitted[0].count} exam papers have not been submitted. Remind teachers to enter marks.`,
        severity: 'info', category: 'academic' });
    }

    let saved = 0;
    for (const ins of insights) {
      await query(`
        INSERT INTO ai_insights(school_id, title, description, severity, category)
        VALUES($1,$2,$3,$4,$5) ON CONFLICT DO NOTHING`,
        [ins.schoolId, ins.title, ins.description, ins.severity, ins.category||'general']
      ).catch(()=>{});
      saved++;
    }

    res.json({ generated: saved, insights });
  } catch (e) { res.status(500).json({ error: e.message }); }
};

const dismissInsight = async (req, res) => {
  try {
    await query('UPDATE ai_insights SET is_dismissed=true WHERE id=$1 AND school_id=$2',
      [req.params.id, req.schoolId]).catch(()=>{});
    res.json({ success: true });
  } catch (e) { res.json({ success: true }); }
};

const recordBehaviour = async (req, res) => {
  try {
    const { studentId, category, rating, teacherRemarks, term } = req.body;
    const { rows } = await query(`
      INSERT INTO student_behaviour(school_id, student_id, class_id, term,
        category, rating, teacher_remarks, assessed_by)
      SELECT $1, $2, s.current_class_id, $3, $4, $5, $6, $7
      FROM students s WHERE s.id=$2 AND s.school_id=$1
      RETURNING *`,
      [req.schoolId, studentId, term||'term_1', category||'conduct', rating||'good', teacherRemarks||null, req.user.id]
    ).catch(() => ({ rows: [] }));
    res.status(201).json(rows[0] || { success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
};

const recordDiscipline = async (req, res) => {
  try {
    const { studentId, type, severity, date, action, description, resolution } = req.body;
    if (!studentId || !description) return res.status(400).json({ error: 'studentId and description required' });
    const { rows } = await query(`
      INSERT INTO discipline_incidents(school_id, student_id, class_id, incident_type,
        severity, incident_date, action_taken, description, resolution, reported_by)
      SELECT $1, $2, s.current_class_id, $3, $4, $5, $6, $7, $8, $9
      FROM students s WHERE s.id=$2 AND s.school_id=$1
      RETURNING *`,
      [req.schoolId, studentId, type||'misconduct', severity||'minor',
       date||new Date().toISOString().split('T')[0], action||'verbal_warning',
       description, resolution||null, req.user.id]
    ).catch(() => ({ rows: [{ success: true }] }));
    res.status(201).json(rows[0] || { success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
};

const getDiscipline = async (req, res) => {
  try {
    const { rows } = await query(`
      SELECT di.*, s.first_name, s.last_name, s.admission_number,
             c.name as class_name,
             u.first_name || ' ' || u.last_name as reported_by_name
      FROM discipline_incidents di
      JOIN students s ON s.id = di.student_id
      LEFT JOIN classes c ON c.id = di.class_id
      LEFT JOIN users u ON u.id = di.reported_by
      WHERE di.school_id=$1 ORDER BY di.incident_date DESC, di.created_at DESC LIMIT 100`,
      [req.schoolId]
    ).catch(() => ({ rows: [] }));
    res.json(rows);
  } catch (e) { res.json([]); }
};

module.exports = {
  getDashboardStats, getAcademicAnalytics, getPerformanceTrends,
  getAtRiskStudents, getFeeDefaultPredictions,
  getInsights, generateInsights, dismissInsight,
  recordBehaviour, recordDiscipline, getDiscipline,
};
