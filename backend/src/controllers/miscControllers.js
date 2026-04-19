// ============================================================
// Misc Controllers — Alumni, Settings, Rankings, Payments, Schools
// ============================================================
const { query, paginatedQuery } = require('../config/database');

// ── ALUMNI ────────────────────────────────────────────────────
const getAlumni = async (req, res) => {
  const { page = 1, limit = 30, search, yearLeft } = req.query;
  let sql = `SELECT a.* FROM alumni a WHERE a.school_id=$1`;
  const params = [req.schoolId]; let i = 2;
  if (yearLeft) { sql += ` AND a.year_left=$${i++}`; params.push(yearLeft); }
  if (search) {
    sql += ` AND (a.first_name ILIKE $${i} OR a.last_name ILIKE $${i} OR a.admission_number ILIKE $${i})`;
    params.push(`%${search}%`); i++;
  }
  sql += ' ORDER BY a.year_left DESC, a.first_name';
  const result = await paginatedQuery(sql, params, parseInt(page), parseInt(limit));
  res.json(result);
};

const registerAlumni = async (req, res) => {
  const { firstName, lastName, admissionNumber, classOf, yearLeft, currentOccupation, currentLocation, email, phone } = req.body;
  const { rows } = await query(
    `INSERT INTO alumni(school_id, first_name, last_name, admission_number, class_of, year_left, current_occupation, current_location, email, phone)
     VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`,
    [req.schoolId, firstName, lastName, admissionNumber, classOf, yearLeft, currentOccupation, currentLocation, email, phone]
  );
  res.status(201).json(rows[0]);
};

// ── SETTINGS ──────────────────────────────────────────────────
const getSettings = async (req, res) => {
  const { rows } = await query('SELECT settings FROM schools WHERE id=$1', [req.schoolId]);
  res.json(rows[0]?.settings || {});
};

const updateSettings = async (req, res) => {
  const { settings } = req.body;
  const { rows } = await query(
    `UPDATE schools SET settings=settings || $1::jsonb, updated_at=NOW() WHERE id=$2 RETURNING settings`,
    [JSON.stringify(settings), req.schoolId]
  );
  res.json(rows[0]?.settings);
};

// ── RANKINGS ──────────────────────────────────────────────────
const getRankings = async (req, res) => {
  const { rows } = await query(
    `SELECT sr.*, s.name as school_name, s.county
     FROM school_rankings sr JOIN schools s ON sr.school_id=s.id
     WHERE sr.year=EXTRACT(YEAR FROM NOW())
     ORDER BY sr.national_rank NULLS LAST, sr.county_rank NULLS LAST`, []
  );
  res.json(rows);
};

// ── PAYMENTS ──────────────────────────────────────────────────
const getPayments = async (req, res) => {
  const { page = 1, limit = 30, status, method, studentId, from, to } = req.query;
  let sql = `SELECT fp.*, s.first_name || ' ' || s.last_name as student_name, s.admission_number
             FROM fee_payments fp JOIN students s ON fp.student_id=s.id
             WHERE fp.school_id=$1`;
  const params = [req.schoolId]; let i = 2;
  if (status) { sql += ` AND fp.status=$${i++}`; params.push(status); }
  if (method) { sql += ` AND fp.payment_method=$${i++}`; params.push(method); }
  if (studentId) { sql += ` AND fp.student_id=$${i++}`; params.push(studentId); }
  if (from) { sql += ` AND fp.paid_at >= $${i++}`; params.push(from); }
  if (to) { sql += ` AND fp.paid_at <= $${i++}`; params.push(to); }
  sql += ' ORDER BY fp.paid_at DESC';
  const result = await paginatedQuery(sql, params, parseInt(page), parseInt(limit));
  res.json(result);
};

// ── SCHOOLS ───────────────────────────────────────────────────
const getMySchool = async (req, res) => {
  const id = req.schoolId || req.user.schoolId;
  const { rows } = await query('SELECT * FROM schools WHERE id=$1', [id]);
  if (!rows.length) return res.status(404).json({ error: 'School not found' });
  res.json(rows[0]);
};

const updateSchool = async (req, res) => {
  try {
    const { name, shortName, motto, address, phone, email, website, logoUrl, coverPhotoUrl,
            type, boardingType, county, subCounty, description, foundedYear, knecCode } = req.body;
    const id = req.schoolId || req.user?.schoolId;
    if (!name) return res.status(400).json({ error: 'name required' });
    const { rows } = await query(
      `UPDATE schools SET name=$1, short_name=$2, motto=$3, address=$4, phone=$5, email=$6,
         website=$7, logo_url=COALESCE($8,logo_url), cover_photo_url=COALESCE($9,cover_photo_url),
         county=$10, sub_county=$11, description=$12, founded_year=$13, knec_code=$14,
         updated_at=NOW() WHERE id=$15 RETURNING *`,
      [name, shortName||null, motto||null, address||null, phone||null, email||null,
       website||null, logoUrl||null, coverPhotoUrl||null,
       county||null, subCounty||null, description||null, foundedYear||null, knecCode||null, id]
    );
    if (!rows.length) return res.status(404).json({ error: 'School not found' });
    res.json({ message: 'School profile updated', ...rows[0] });
  } catch(e) { res.status(500).json({ error: e.message }); }
};

module.exports = {
  getAlumni, registerAlumni,
  getSettings, updateSettings,
  getRankings,
  getPayments,
  getMySchool, updateSchool,
};
