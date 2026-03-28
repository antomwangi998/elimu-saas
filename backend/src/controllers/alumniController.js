// ============================================================
// Alumni Controller
// ============================================================
const { query } = require('../config/database');

exports.getAlumni = async (req, res) => {
  try {
    const { year, industry, q, featured, limit = 50, offset = 0 } = req.query;
    let sql = `SELECT * FROM alumni_profiles WHERE school_id=$1`;
    const params = [req.schoolId];
    if (year) { params.push(year); sql += ` AND year_completed=$${params.length}`; }
    if (industry) { params.push(`%${industry}%`); sql += ` AND industry ILIKE $${params.length}`; }
    if (featured === 'true') sql += ' AND is_featured=true';
    if (q) { params.push(`%${q}%`); sql += ` AND (first_name ILIKE $${params.length} OR last_name ILIKE $${params.length} OR university ILIKE $${params.length} OR current_employer ILIKE $${params.length})`; }
    sql += ` ORDER BY year_completed DESC, is_featured DESC LIMIT ${parseInt(limit)} OFFSET ${parseInt(offset)}`;
    const { rows } = await query(sql, params);
    const { rows: cnt } = await query(`SELECT COUNT(*) FROM alumni_profiles WHERE school_id=$1`, [req.schoolId]);
    res.json({ data: rows, total: parseInt(cnt[0].count) });
  } catch (e) { res.status(500).json({ error: e.message }); }
};

exports.getAlumnus = async (req, res) => {
  try {
    const { id } = req.params;
    const { rows } = await query(`SELECT * FROM alumni_profiles WHERE id=$1 AND school_id=$2`, [id, req.schoolId]);
    if (!rows.length) return res.status(404).json({ error: 'Not found' });
    res.json(rows[0]);
  } catch (e) { res.status(500).json({ error: e.message }); }
};

exports.createAlumnus = async (req, res) => {
  try {
    const { studentId, firstName, lastName, admissionNumber, yearCompleted, kcseGrade, kcsePoints,
            university, course, currentEmployer, currentPosition, industry, location,
            phone, email, linkedinUrl, bio, achievements, isFeatured = false } = req.body;
    if (!firstName || !lastName || !yearCompleted) return res.status(400).json({ error: 'Name and year required' });
    const { rows } = await query(
      `INSERT INTO alumni_profiles(school_id,student_id,first_name,last_name,admission_number,year_completed,
        kcse_grade,kcse_points,university,course,current_employer,current_position,industry,location,
        phone,email,linkedin_url,bio,achievements,is_featured)
       VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20) RETURNING *`,
      [req.schoolId, studentId||null, firstName, lastName, admissionNumber, yearCompleted,
       kcseGrade, kcsePoints, university, course, currentEmployer, currentPosition,
       industry, location, phone, email, linkedinUrl, bio, achievements, isFeatured]
    );
    res.json(rows[0]);
  } catch (e) { res.status(500).json({ error: e.message }); }
};

exports.updateAlumnus = async (req, res) => {
  try {
    const { id } = req.params;
    const { university, course, currentEmployer, currentPosition, industry, location,
            phone, email, linkedinUrl, bio, achievements, isFeatured, isVerified } = req.body;
    const { rows } = await query(
      `UPDATE alumni_profiles SET university=$1,course=$2,current_employer=$3,current_position=$4,
        industry=$5,location=$6,phone=$7,email=$8,linkedin_url=$9,bio=$10,achievements=$11,
        is_featured=$12,is_verified=$13,last_updated=NOW()
       WHERE id=$14 AND school_id=$15 RETURNING *`,
      [university, course, currentEmployer, currentPosition, industry, location,
       phone, email, linkedinUrl, bio, achievements, isFeatured, isVerified, id, req.schoolId]
    );
    res.json(rows[0]);
  } catch (e) { res.status(500).json({ error: e.message }); }
};

exports.deleteAlumnus = async (req, res) => {
  try {
    await query(`DELETE FROM alumni_profiles WHERE id=$1 AND school_id=$2`, [req.params.id, req.schoolId]);
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
};

exports.getStats = async (req, res) => {
  try {
    const { rows } = await query(
      `SELECT
        COUNT(*) AS total,
        COUNT(DISTINCT year_completed) AS years,
        COUNT(CASE WHEN university IS NOT NULL THEN 1 END) AS in_university,
        COUNT(CASE WHEN current_employer IS NOT NULL THEN 1 END) AS employed,
        AVG(kcse_points::numeric) FILTER (WHERE kcse_points IS NOT NULL) AS avg_kcse,
        MAX(year_completed) AS latest_year,
        MIN(year_completed) AS earliest_year
       FROM alumni_profiles WHERE school_id=$1`,
      [req.schoolId]
    );
    const { rows: industries } = await query(
      `SELECT industry, COUNT(*) AS count FROM alumni_profiles
       WHERE school_id=$1 AND industry IS NOT NULL GROUP BY industry ORDER BY count DESC LIMIT 8`,
      [req.schoolId]
    );
    const { rows: byYear } = await query(
      `SELECT year_completed, COUNT(*) AS count FROM alumni_profiles
       WHERE school_id=$1 GROUP BY year_completed ORDER BY year_completed DESC LIMIT 10`,
      [req.schoolId]
    );
    res.json({ ...rows[0], industries, byYear });
  } catch (e) { res.status(500).json({ error: e.message }); }
};

// ── Alumni Events ─────────────────────────────────────────────
exports.getEvents = async (req, res) => {
  try {
    const { rows } = await query(
      `SELECT ae.*, u.first_name||' '||u.last_name AS organizer_name,
              COUNT(ar.id) AS rsvp_count
       FROM alumni_events ae LEFT JOIN users u ON ae.organizer_id=u.id
       LEFT JOIN alumni_event_rsvps ar ON ar.event_id=ae.id
       WHERE ae.school_id=$1 GROUP BY ae.id, u.first_name, u.last_name ORDER BY ae.event_date DESC`,
      [req.schoolId]
    );
    res.json(rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
};

exports.createEvent = async (req, res) => {
  try {
    const { title, description, eventDate, location, eventType, maxCapacity, rsvpDeadline } = req.body;
    const { rows } = await query(
      `INSERT INTO alumni_events(school_id,title,description,event_date,location,event_type,max_capacity,rsvp_deadline,organizer_id)
       VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
      [req.schoolId, title, description, eventDate, location, eventType||'reunion', maxCapacity||null, rsvpDeadline||null, req.user.id]
    );
    res.json(rows[0]);
  } catch (e) { res.status(500).json({ error: e.message }); }
};

exports.bulkImport = async (req, res) => {
  try {
    const { alumni } = req.body;
    if (!Array.isArray(alumni) || !alumni.length) return res.status(400).json({ error: 'Alumni array required' });
    let imported = 0, skipped = 0;
    for (const a of alumni) {
      try {
        await query(
          `INSERT INTO alumni_profiles(school_id,first_name,last_name,admission_number,year_completed,kcse_grade,university,current_employer)
           VALUES($1,$2,$3,$4,$5,$6,$7,$8)
           ON CONFLICT DO NOTHING`,
          [req.schoolId, a.firstName||a.first_name, a.lastName||a.last_name,
           a.admissionNumber||a.admission_number, a.yearCompleted||a.year_completed,
           a.kcseGrade||a.kcse_grade, a.university, a.currentEmployer||a.current_employer]
        );
        imported++;
      } catch { skipped++; }
    }
    res.json({ imported, skipped, total: alumni.length });
  } catch (e) { res.status(500).json({ error: e.message }); }
};
