// ============================================================
// Behaviour & Discipline Controller
// ============================================================
const { query } = require('../config/database');

// ── Behaviour ─────────────────────────────────────────────────
exports.getBehaviourByClass = async (req, res) => {
  try {
    const { classId, term, year = new Date().getFullYear() } = req.query;
    let sql = `SELECT sb.*, u.first_name, u.last_name, u.admission_number, u.class_id,
                      c.name AS class_name
               FROM student_behaviour sb
               JOIN users u ON sb.student_id=u.id
               LEFT JOIN classes c ON u.class_id=c.id
               WHERE sb.school_id=$1 AND sb.year=$2`;
    const params = [req.schoolId, year];
    if (classId) { params.push(classId); sql += ` AND u.class_id=$${params.length}`; }
    if (term) { params.push(term); sql += ` AND sb.term=$${params.length}`; }
    sql += ' ORDER BY u.last_name';
    const { rows } = await query(sql, params);
    res.json(rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
};

exports.getBehaviourByStudent = async (req, res) => {
  try {
    const { studentId } = req.params;
    const { rows } = await query(
      `SELECT * FROM student_behaviour WHERE student_id=$1 AND school_id=$2 ORDER BY year DESC, term`,
      [studentId, req.schoolId]
    );
    res.json(rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
};

exports.saveBehaviour = async (req, res) => {
  try {
    const { studentId, term, year = new Date().getFullYear(),
            conduct, neatness, punctuality, diligence, leadership, participation, cooperation,
            teacherRemarks } = req.body;
    if (!studentId || !term) return res.status(400).json({ error: 'Student and term required' });
    const { rows } = await query(
      `INSERT INTO student_behaviour(school_id,student_id,term,year,conduct,neatness,punctuality,
        diligence,leadership,participation,cooperation,teacher_remarks,class_teacher_id)
       VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
       ON CONFLICT(school_id,student_id,term,year) DO UPDATE SET
         conduct=$5,neatness=$6,punctuality=$7,diligence=$8,leadership=$9,
         participation=$10,cooperation=$11,teacher_remarks=$12,class_teacher_id=$13,updated_at=NOW()
       RETURNING *`,
      [req.schoolId, studentId, term, year, conduct, neatness, punctuality,
       diligence, leadership, participation, cooperation, teacherRemarks, req.user.id]
    );
    res.json(rows[0]);
  } catch (e) { res.status(500).json({ error: e.message }); }
};

exports.bulkSaveBehaviour = async (req, res) => {
  try {
    const { records } = req.body;
    if (!Array.isArray(records)) return res.status(400).json({ error: 'Records array required' });
    let saved = 0;
    for (const r of records) {
      try {
        await query(
          `INSERT INTO student_behaviour(school_id,student_id,term,year,conduct,neatness,punctuality,
            diligence,leadership,participation,cooperation,teacher_remarks,class_teacher_id)
           VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
           ON CONFLICT(school_id,student_id,term,year) DO UPDATE SET
             conduct=$5,neatness=$6,punctuality=$7,diligence=$8,leadership=$9,
             participation=$10,cooperation=$11,teacher_remarks=$12,updated_at=NOW()`,
          [req.schoolId, r.studentId, r.term, r.year||new Date().getFullYear(),
           r.conduct, r.neatness, r.punctuality, r.diligence, r.leadership,
           r.participation, r.cooperation, r.teacherRemarks, req.user.id]
        );
        saved++;
      } catch { }
    }
    res.json({ saved });
  } catch (e) { res.status(500).json({ error: e.message }); }
};

// ── Discipline Incidents ──────────────────────────────────────
exports.getIncidents = async (req, res) => {
  try {
    const { studentId, severity, resolved, from, to, limit = 50 } = req.query;
    let sql = `SELECT di.*, u.first_name, u.last_name, u.admission_number,
                      c.name AS class_name,
                      r.first_name||' '||r.last_name AS reported_by_name,
                      h.first_name||' '||h.last_name AS handled_by_name
               FROM discipline_incidents di
               JOIN users u ON di.student_id=u.id
               LEFT JOIN classes c ON u.class_id=c.id
               LEFT JOIN users r ON di.reported_by=r.id
               LEFT JOIN users h ON di.handled_by=h.id
               WHERE di.school_id=$1`;
    const params = [req.schoolId];
    if (studentId) { params.push(studentId); sql += ` AND di.student_id=$${params.length}`; }
    if (severity) { params.push(severity); sql += ` AND di.severity=$${params.length}`; }
    if (resolved !== undefined) { params.push(resolved === 'true'); sql += ` AND di.resolved=$${params.length}`; }
    if (from) { params.push(from); sql += ` AND di.incident_date>=$${params.length}`; }
    if (to) { params.push(to); sql += ` AND di.incident_date<=$${params.length}`; }
    sql += ` ORDER BY di.incident_date DESC LIMIT ${parseInt(limit)}`;
    const { rows } = await query(sql, params);
    res.json(rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
};

exports.getIncident = async (req, res) => {
  try {
    const { id } = req.params;
    const { rows } = await query(
      `SELECT di.*, u.first_name, u.last_name, u.admission_number,
              c.name AS class_name
       FROM discipline_incidents di
       JOIN users u ON di.student_id=u.id LEFT JOIN classes c ON u.class_id=c.id
       WHERE di.id=$1 AND di.school_id=$2`,
      [id, req.schoolId]
    );
    if (!rows.length) return res.status(404).json({ error: 'Incident not found' });
    const { rows: letters } = await query(
      `SELECT * FROM discipline_letters WHERE incident_id=$1 ORDER BY created_at DESC`, [id]
    );
    res.json({ ...rows[0], letters });
  } catch (e) { res.status(500).json({ error: e.message }); }
};

exports.createIncident = async (req, res) => {
  try {
    const { studentId, incidentType, severity = 'minor', incidentDate, description,
            location, witnesses, actionTaken, actionDetails, suspensionDays = 0,
            suspensionStart, suspensionEnd, parentNotified = false, followUpDate } = req.body;
    if (!studentId || !description) return res.status(400).json({ error: 'Student and description required' });
    const { rows } = await query(
      `INSERT INTO discipline_incidents(school_id,student_id,incident_type,severity,incident_date,description,
        location,witnesses,action_taken,action_details,suspension_days,suspension_start,suspension_end,
        parent_notified,follow_up_date,reported_by,handled_by)
       VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17) RETURNING *`,
      [req.schoolId, studentId, incidentType||'misconduct', severity,
       incidentDate||new Date().toISOString().split('T')[0], description,
       location, witnesses, actionTaken, actionDetails, suspensionDays,
       suspensionStart||null, suspensionEnd||null, parentNotified, followUpDate||null,
       req.user.id, req.user.id]
    );

    // Auto-notify parent if requested
    if (parentNotified) {
      await query(
        `UPDATE discipline_incidents SET parent_notified=true,parent_notified_at=NOW() WHERE id=$1`, [rows[0].id]
      );
    }
    res.json(rows[0]);
  } catch (e) { res.status(500).json({ error: e.message }); }
};

exports.updateIncident = async (req, res) => {
  try {
    const { id } = req.params;
    const { actionTaken, actionDetails, resolved, resolutionNotes, parentResponse, followUpDate } = req.body;
    const { rows } = await query(
      `UPDATE discipline_incidents SET action_taken=$1,action_details=$2,resolved=$3,
        resolution_notes=$4,parent_response=$5,follow_up_date=$6,
        resolved_at=CASE WHEN $3=true THEN NOW() ELSE resolved_at END,updated_at=NOW()
       WHERE id=$7 AND school_id=$8 RETURNING *`,
      [actionTaken, actionDetails, resolved||false, resolutionNotes, parentResponse, followUpDate||null, id, req.schoolId]
    );
    res.json(rows[0]);
  } catch (e) { res.status(500).json({ error: e.message }); }
};

exports.getSummaryByStudent = async (req, res) => {
  try {
    const { studentId } = req.params;
    const { rows } = await query(
      `SELECT severity, COUNT(*) AS count,
              COUNT(CASE WHEN resolved=true THEN 1 END) AS resolved,
              COUNT(CASE WHEN resolved=false THEN 1 END) AS pending
       FROM discipline_incidents WHERE student_id=$1 AND school_id=$2
       GROUP BY severity`,
      [studentId, req.schoolId]
    );
    const { rows: recent } = await query(
      `SELECT * FROM discipline_incidents WHERE student_id=$1 AND school_id=$2
       ORDER BY incident_date DESC LIMIT 5`,
      [studentId, req.schoolId]
    );
    res.json({ summary: rows, recent });
  } catch (e) { res.status(500).json({ error: e.message }); }
};

// ── Discipline Letters ────────────────────────────────────────
exports.generateLetter = async (req, res) => {
  try {
    const { incidentId, studentId, letterType, customContent } = req.body;
    const school = await query(`SELECT * FROM schools WHERE id=$1`, [req.schoolId]);
    const student = await query(
      `SELECT u.*, c.name AS class_name FROM users u LEFT JOIN classes c ON u.class_id=c.id WHERE u.id=$1`,
      [studentId]
    );
    const s = school.rows[0] || {};
    const st = student.rows[0] || {};
    const today = new Date().toLocaleDateString('en-KE', { dateStyle: 'long' });

    const templates = {
      suspension: `<div style="font-family:Georgia,serif;padding:20px;max-width:760px;margin:auto">
        <p style="text-align:right">${today}</p>
        <p>Dear Parent/Guardian of <strong>${st.first_name} ${st.last_name}</strong>,</p>
        <p>RE: <strong>SUSPENSION LETTER</strong></p>
        <p>We regret to inform you that your child <strong>${st.first_name} ${st.last_name}</strong> (${st.admission_number}), 
        a student in <strong>${st.class_name}</strong>, has been suspended from school due to a serious disciplinary offence.</p>
        <p>You are requested to accompany your child to school for a meeting with the Principal before readmission.</p>
        <p>Yours sincerely,</p><br><p>_________________________</p>
        <p><strong>Principal, ${s.name}</strong></p></div>`,
      invitation: `<div style="font-family:Georgia,serif;padding:20px;max-width:760px;margin:auto">
        <p style="text-align:right">${today}</p>
        <p>Dear Parent/Guardian of <strong>${st.first_name} ${st.last_name}</strong>,</p>
        <p>RE: <strong>PARENT INVITATION</strong></p>
        <p>You are invited to meet with the school administration regarding your child <strong>${st.first_name} ${st.last_name}</strong>
        (${st.admission_number}), <strong>${st.class_name}</strong>. Please report to the school at your earliest convenience.</p>
        <p>Yours sincerely,</p><br><p>_________________________</p>
        <p><strong>Principal, ${s.name}</strong></p></div>`,
      warning: `<div style="font-family:Georgia,serif;padding:20px;max-width:760px;margin:auto">
        <p style="text-align:right">${today}</p>
        <p>Dear Parent/Guardian,</p>
        <p>RE: <strong>WRITTEN WARNING — ${st.first_name} ${st.last_name}</strong></p>
        <p>This letter serves as a formal written warning regarding the behaviour of your child <strong>${st.first_name} ${st.last_name}</strong> 
        (${st.admission_number}). We urge you to counsel your child accordingly.</p>
        <p>Yours sincerely,</p><br><p>_________________________</p>
        <p><strong>Class Teacher / Dean of Students, ${s.name}</strong></p></div>`,
    };

    const html = customContent || templates[letterType] || templates.warning;
    const { rows } = await query(
      `INSERT INTO discipline_letters(school_id,incident_id,student_id,letter_type,content_html,issued_by)
       VALUES($1,$2,$3,$4,$5,$6) RETURNING *`,
      [req.schoolId, incidentId||null, studentId, letterType||'warning', html, req.user.id]
    );
    res.json({ ...rows[0], html });
  } catch (e) { res.status(500).json({ error: e.message }); }
};

exports.getDisciplineStats = async (req, res) => {
  try {
    const { rows } = await query(
      `SELECT incident_type, severity, COUNT(*) AS count
       FROM discipline_incidents WHERE school_id=$1 AND incident_date >= NOW() - INTERVAL '90 days'
       GROUP BY incident_type, severity ORDER BY count DESC`,
      [req.schoolId]
    );
    const { rows: topStudents } = await query(
      `SELECT di.student_id, u.first_name, u.last_name, u.admission_number,
              c.name AS class_name, COUNT(*) AS incident_count
       FROM discipline_incidents di JOIN users u ON di.student_id=u.id
       LEFT JOIN classes c ON u.class_id=c.id
       WHERE di.school_id=$1 AND di.incident_date >= NOW() - INTERVAL '90 days'
       GROUP BY di.student_id, u.first_name, u.last_name, u.admission_number, c.name
       ORDER BY incident_count DESC LIMIT 10`,
      [req.schoolId]
    );
    res.json({ byType: rows, topStudents });
  } catch (e) { res.status(500).json({ error: e.message }); }
};
