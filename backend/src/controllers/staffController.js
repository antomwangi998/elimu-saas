// ============================================================
// Staff Controller — CRUD, TSC, Payroll, Subjects
// ============================================================
const { query, withTransaction, paginatedQuery } = require('../config/database');
const { cache } = require('../config/redis');
const bcrypt = require('bcryptjs');

// ── GET /api/staff ────────────────────────────────────────────
const getStaff = async (req, res) => {
  const { page = 1, limit = 30, search, department, isActive = 'true', role } = req.query;

  let sql = `
    SELECT s.id, s.staff_number, s.tsc_number, s.designation, s.department,
           s.employment_type, s.employment_date, s.is_hod, s.hod_department,
           s.specialization, s.is_active,
           u.first_name, u.last_name, u.email, u.phone, u.photo_url, u.role
    FROM staff s
    JOIN users u ON s.user_id = u.id
    WHERE s.school_id = $1
  `;
  const params = [req.schoolId];
  let i = 2;

  if (isActive !== 'all') { sql += ` AND s.is_active = $${i++}`; params.push(isActive === 'true'); }
  if (department) { sql += ` AND s.department = $${i++}`; params.push(department); }
  if (role) { sql += ` AND u.role = $${i++}`; params.push(role); }
  if (search) {
    sql += ` AND (u.first_name ILIKE $${i} OR u.last_name ILIKE $${i} OR s.staff_number ILIKE $${i} OR s.tsc_number ILIKE $${i})`;
    params.push(`%${search}%`); i++;
  }
  sql += ' ORDER BY u.first_name, u.last_name';

  const result = await paginatedQuery(sql, params, parseInt(page), parseInt(limit));
  res.json(result);
};

// ── GET /api/staff/:id ────────────────────────────────────────
const getStaffMember = async (req, res) => {
  const { rows } = await query(
    `SELECT s.*, u.first_name, u.last_name, u.email, u.phone, u.photo_url,
            u.role, u.gender, u.national_id, u.date_of_birth
     FROM staff s
     JOIN users u ON s.user_id = u.id
     WHERE s.id = $1 AND s.school_id = $2`,
    [req.params.id, req.schoolId]
  );
  if (!rows.length) return res.status(404).json({ error: 'Staff member not found' });

  // Get subjects taught
  const { rows: subjects } = await query(
    `SELECT sub.name, sub.code, c.name as class_name
     FROM class_subjects cs
     JOIN subjects sub ON cs.subject_id = sub.id
     JOIN classes c ON cs.class_id = c.id
     WHERE cs.teacher_id = $1 AND cs.school_id = $2`,
    [rows[0].user_id, req.schoolId]
  );

  res.json({ ...rows[0], subjects });
};

// ── POST /api/staff ───────────────────────────────────────────
const createStaff = async (req, res) => {
  const {
    firstName, lastName, email, phone, gender, nationalId, dateOfBirth,
    staffNumber, tscNumber, designation, department, employmentType,
    employmentDate, qualification, specialization, isHod, hodDepartment,
    salaryGrade, bankName, bankAccount, nextOfKinName, nextOfKinPhone,
    nextOfKinRelationship, role = 'teacher',
  } = req.body;

  if (!firstName || !lastName || !email || !staffNumber) {
    return res.status(400).json({ error: 'firstName, lastName, email, staffNumber are required' });
  }

  const result = await withTransaction(async (client) => {
    // Create user account
    const tempPwd = Math.random().toString(36).slice(-8).toUpperCase();
    const hash = await bcrypt.hash(tempPwd, 10);

    const { rows: userRows } = await client.query(
      `INSERT INTO users(school_id, role, email, phone, password_hash, first_name, last_name,
         gender, national_id, must_change_password)
       VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,true)
       ON CONFLICT(email) DO UPDATE SET school_id=$1, role=$2, first_name=$6, last_name=$7
       RETURNING *`,
      [req.schoolId, role, email, phone, hash, firstName, lastName, gender, nationalId]
    );
    const user = userRows[0];

    const { rows } = await client.query(
      `INSERT INTO staff(school_id, user_id, staff_number, tsc_number, designation, department,
         employment_type, employment_date, qualification, specialization, is_hod, hod_department,
         salary_grade, bank_name, bank_account, next_of_kin_name, next_of_kin_phone, next_of_kin_relationship)
       VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18)
       RETURNING *`,
      [
        req.schoolId, user.id, staffNumber.toUpperCase(), tscNumber, designation, department,
        employmentType || 'permanent', employmentDate, qualification,
        specialization || [], isHod || false, hodDepartment,
        salaryGrade, bankName, bankAccount, nextOfKinName, nextOfKinPhone, nextOfKinRelationship,
      ]
    );

    return { ...rows[0], tempPassword: tempPwd, email };
  });

  res.status(201).json(result);
};

// ── PUT /api/staff/:id ────────────────────────────────────────
const updateStaff = async (req, res) => {
  const { id } = req.params;
  const {
    designation, department, employmentType, qualification, specialization,
    isHod, hodDepartment, salaryGrade, bankName, bankAccount,
    nextOfKinName, nextOfKinPhone, nextOfKinRelationship, isActive,
  } = req.body;

  const { rows } = await query(
    `UPDATE staff SET
       designation=$1, department=$2, employment_type=$3, qualification=$4,
       specialization=$5, is_hod=$6, hod_department=$7, salary_grade=$8,
       bank_name=$9, bank_account=$10, next_of_kin_name=$11, next_of_kin_phone=$12,
       next_of_kin_relationship=$13, is_active=$14
     WHERE id=$15 AND school_id=$16 RETURNING *`,
    [designation, department, employmentType, qualification, specialization || [],
     isHod, hodDepartment, salaryGrade, bankName, bankAccount,
     nextOfKinName, nextOfKinPhone, nextOfKinRelationship, isActive, id, req.schoolId]
  );
  if (!rows.length) return res.status(404).json({ error: 'Staff member not found' });
  res.json(rows[0]);
};

// ── DELETE /api/staff/:id ─────────────────────────────────────
const deleteStaff = async (req, res) => {
  const { rows } = await query(
    `UPDATE staff SET is_active=false WHERE id=$1 AND school_id=$2 RETURNING id`,
    [req.params.id, req.schoolId]
  );
  if (!rows.length) return res.status(404).json({ error: 'Staff member not found' });
  res.json({ message: 'Staff member deactivated' });
};

// ── GET /api/staff/stats ──────────────────────────────────────
const getStaffStats = async (req, res) => {
  const cacheKey = `staff-stats:${req.schoolId}`;
  const cached = await cache.get(cacheKey);
  if (cached) return res.json(cached);

  const { rows } = await query(
    `SELECT
       COUNT(*) FILTER (WHERE s.is_active=true) as total,
       COUNT(*) FILTER (WHERE s.is_active=true AND u.role='teacher') as teachers,
       COUNT(*) FILTER (WHERE s.is_active=true AND s.is_hod=true) as hods,
       COUNT(*) FILTER (WHERE s.is_active=true AND s.employment_type='permanent') as permanent,
       COUNT(*) FILTER (WHERE s.is_active=true AND s.employment_type='contract') as contract,
       COUNT(*) FILTER (WHERE s.is_active=true AND u.gender='male') as male,
       COUNT(*) FILTER (WHERE s.is_active=true AND u.gender='female') as female
     FROM staff s JOIN users u ON s.user_id=u.id
     WHERE s.school_id=$1`,
    [req.schoolId]
  );

  const { rows: byDept } = await query(
    `SELECT department, COUNT(*) as count
     FROM staff WHERE school_id=$1 AND is_active=true AND department IS NOT NULL
     GROUP BY department ORDER BY count DESC`,
    [req.schoolId]
  );

  const stats = { overview: rows[0], byDepartment: byDept };
  await cache.set(cacheKey, stats, 120);
  res.json(stats);
};

// ── Assign subjects to teacher ────────────────────────────────
const assignSubjects = async (req, res) => {
  const { staffId } = req.params;
  const { assignments } = req.body; // [{classId, subjectId}]

  const staffRow = await query('SELECT user_id FROM staff WHERE id=$1 AND school_id=$2', [staffId, req.schoolId]);
  if (!staffRow.rows.length) return res.status(404).json({ error: 'Staff not found' });

  const teacherId = staffRow.rows[0].user_id;
  let assigned = 0;

  for (const a of assignments) {
    await query(
      `UPDATE class_subjects SET teacher_id=$1 WHERE class_id=$2 AND subject_id=$3 AND school_id=$4`,
      [teacherId, a.classId, a.subjectId, req.schoolId]
    );
    assigned++;
  }

  res.json({ message: `${assigned} subject assignments updated` });
};

module.exports = {
  getStaff, getStaffMember, createStaff, updateStaff, deleteStaff, getStaffStats, assignSubjects,
};
