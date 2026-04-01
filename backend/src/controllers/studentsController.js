// ============================================================
// Students Controller — Full Enterprise Implementation
// CRUD · Admission · Academic History · Fee Summary
// Discipline · Promotion · Transfer · Medical · Parents
// ============================================================
const { query, withTransaction, paginatedQuery } = require('../config/database');
const { cache } = require('../config/redis');
const bcrypt = require('bcryptjs');

const getStudents = async (req, res) => {
  try {
    const { page=1, limit=30, search, classId, isBoarding, isActive='true', gender, stream } = req.query;
    let sql = `SELECT s.id, s.admission_number, s.first_name, s.last_name, s.other_names,
                 s.gender, s.date_of_birth, s.photo_url, s.is_active, s.is_boarding,
                 s.admission_date, s.dorm_name, s.blood_group, s.kcpe_index_no,
                 c.name as class_name, c.level, c.stream, c.id as class_id,
                 (SELECT sp.phone FROM student_parents sp WHERE sp.student_id=s.id AND sp.is_primary=true LIMIT 1) as parent_phone,
                 (SELECT sp.first_name || ' ' || sp.last_name FROM student_parents sp WHERE sp.student_id=s.id AND sp.is_primary=true LIMIT 1) as parent_name,
                 (SELECT COUNT(*) FROM attendance_records ar WHERE ar.student_id=s.id AND ar.status='absent' AND ar.school_id=s.school_id) as total_absences,
                 ROUND((SELECT AVG(sm.marks) FROM student_marks sm JOIN exam_papers ep ON ep.id=sm.exam_paper_id WHERE sm.student_id=s.id AND NOT sm.is_absent AND sm.marks IS NOT NULL),2) as overall_avg
               FROM students s LEFT JOIN classes c ON s.current_class_id = c.id
               WHERE s.school_id = $1`;
    const params = [req.schoolId]; let i = 2;
    if (isActive !== 'all') { sql += ` AND s.is_active = $${i++}`; params.push(isActive === 'true'); }
    if (classId) { sql += ` AND s.current_class_id = $${i++}`; params.push(classId); }
    if (stream)  { sql += ` AND c.stream = $${i++}`; params.push(stream); }
    if (gender)  { sql += ` AND s.gender = $${i++}`; params.push(gender); }
    if (isBoarding !== undefined) { sql += ` AND s.is_boarding = $${i++}`; params.push(isBoarding === 'true'); }
    if (search) { sql += ` AND (s.first_name ILIKE $${i} OR s.last_name ILIKE $${i} OR s.admission_number ILIKE $${i} OR s.other_names ILIKE $${i})`; params.push(`%${search}%`); i++; }
    sql += ' ORDER BY s.first_name, s.last_name';
    const result = await paginatedQuery(sql, params, parseInt(page), parseInt(limit));
    res.json(result);
  } catch (e) { res.status(500).json({ error: e.message }); }
};

const getStudent = async (req, res) => {
  try {
    const { rows } = await query(`
      SELECT s.*,
             c.name as class_name, c.level, c.stream, c.id as class_id,
             ct.first_name || ' ' || ct.last_name as class_teacher_name
      FROM students s
      LEFT JOIN classes c ON s.current_class_id = c.id
      LEFT JOIN users ct ON ct.id = c.class_teacher_id
      WHERE s.id = $1 AND s.school_id = $2`, [req.params.id, req.schoolId]);
    if (!rows.length) return res.status(404).json({ error: 'Student not found' });
    const s = rows[0];

    const [parents, feeBalance, recentMarks, attendance, behaviour, history] = await Promise.all([
      query(`SELECT * FROM student_parents WHERE student_id=$1 ORDER BY is_primary DESC`, [s.id]),
      query(`SELECT COALESCE(sfa.net_fees,0) as expected, COALESCE(SUM(fp.amount) FILTER (WHERE fp.status='completed'),0) as paid,
               COALESCE(sfa.net_fees,0) - COALESCE(SUM(fp.amount) FILTER (WHERE fp.status='completed'),0) as balance
             FROM student_fee_assignments sfa LEFT JOIN fee_payments fp ON fp.student_id=sfa.student_id
             WHERE sfa.student_id=$1 GROUP BY sfa.net_fees LIMIT 1`, [s.id]),
      query(`SELECT es.name as exam_name, sub.name as subject_name, sm.marks, sm.grade, sm.points, sm.is_absent
             FROM student_marks sm JOIN exam_papers ep ON ep.id=sm.exam_paper_id
             JOIN exam_series es ON es.id=ep.exam_series_id JOIN subjects sub ON sub.id=ep.subject_id
             WHERE sm.student_id=$1 ORDER BY es.start_date DESC, sub.name LIMIT 20`, [s.id]),
      query(`SELECT COUNT(*) FILTER (WHERE status='present') as present, COUNT(*) FILTER (WHERE status='absent') as absent, COUNT(*) as total
             FROM attendance_records WHERE student_id=$1 AND school_id=$2`, [s.id, req.schoolId]),
      query(`SELECT category, rating, teacher_remarks, assessed_at FROM student_behaviour
             WHERE student_id=$1 AND school_id=$2 ORDER BY assessed_at DESC LIMIT 10`, [s.id, req.schoolId]).catch(()=>({rows:[]})),
      query(`SELECT sch.name as from_class, sch.name as to_class, sch.created_at as promoted_at
             FROM student_class_history sch WHERE sch.student_id=$1 ORDER BY sch.created_at DESC LIMIT 5`, [s.id]).catch(()=>({rows:[]})),
    ]);

    res.json({ ...s, parents: parents.rows, feeBalance: feeBalance.rows[0]||{},
      recentMarks, attendance: attendance.rows[0]||{},
      behaviour: behaviour.rows, classHistory: history.rows });
  } catch (e) { res.status(500).json({ error: e.message }); }
};

const createStudent = async (req, res) => {
  try {
    const {
      firstName, lastName, otherNames, admissionNumber, gender, dateOfBirth,
      classId, admissionDate, isBoarding, dormName, bloodGroup, kcpeIndexNo, photoUrl,
      parentFirstName, parentLastName, parentPhone, parentEmail, parentRelationship, parentOccupation,
    } = req.body;
    if (!firstName || !lastName || !admissionNumber || !gender || !classId) {
      return res.status(400).json({ error: 'firstName, lastName, admissionNumber, gender, classId required' });
    }
    const existing = await query('SELECT id FROM students WHERE admission_number=$1 AND school_id=$2', [admissionNumber, req.schoolId]);
    if (existing.rows.length) return res.status(409).json({ error: 'Admission number already exists' });

    await withTransaction(async (client) => {
      const { rows } = await client.query(`
        INSERT INTO students(school_id, first_name, last_name, other_names, admission_number,
          gender, date_of_birth, current_class_id, admission_date, is_boarding, dorm_name,
          blood_group, kcpe_index_no, photo_url)
        VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14) RETURNING *`,
        [req.schoolId, firstName, lastName, otherNames||null, admissionNumber, gender,
         dateOfBirth||null, classId, admissionDate||new Date().toISOString().split('T')[0],
         isBoarding||false, dormName||null, bloodGroup||null, kcpeIndexNo||null, photoUrl||null]);
      const student = rows[0];

      if (parentFirstName && parentPhone) {
        let parentUserId = null;
        const existingUser = await client.query("SELECT id FROM users WHERE phone=$1 AND role='parent'", [parentPhone]).catch(()=>({rows:[]}));
        if (existingUser.rows.length) {
          parentUserId = existingUser.rows[0].id;
        } else {
          const tempPass = await bcrypt.hash('Parent@'+parentPhone.slice(-4), 10);
          const { rows: user } = await client.query(`
            INSERT INTO users(school_id, first_name, last_name, email, phone, role, password_hash, is_active)
            VALUES($1,$2,$3,$4,$5,'parent',$6,true) RETURNING id`,
            [req.schoolId, parentFirstName, parentLastName||'', parentEmail||null, parentPhone, tempPass]);
          parentUserId = user[0].id;
        }
        await client.query(`
          INSERT INTO student_parents(student_id, first_name, last_name, phone, email,
            relationship, occupation, is_primary, user_id)
          VALUES($1,$2,$3,$4,$5,$6,$7,true,$8)
          ON CONFLICT DO NOTHING`,
          [student.id, parentFirstName, parentLastName||'', parentPhone,
           parentEmail||null, parentRelationship||'parent', parentOccupation||null, parentUserId]);
      }

      await client.query("INSERT INTO student_class_history(student_id, class_id, school_id, action) VALUES($1,$2,$3,'admitted')",
        [student.id, classId, req.schoolId]).catch(()=>{});

      res.status(201).json(student);
    });
  } catch (e) { res.status(500).json({ error: e.message }); }
};

const updateStudent = async (req, res) => {
  try {
    const {
      firstName, lastName, otherNames, gender, dateOfBirth, classId,
      isBoarding, dormName, bloodGroup, photoUrl, isActive, medicalNotes,
    } = req.body;
    const { rows } = await query(`
      UPDATE students SET
        first_name=COALESCE($1,first_name), last_name=COALESCE($2,last_name),
        other_names=COALESCE($3,other_names), gender=COALESCE($4,gender),
        date_of_birth=COALESCE($5,date_of_birth), current_class_id=COALESCE($6,current_class_id),
        is_boarding=COALESCE($7,is_boarding), dorm_name=COALESCE($8,dorm_name),
        blood_group=COALESCE($9,blood_group), photo_url=COALESCE($10,photo_url),
        is_active=COALESCE($11,is_active), medical_notes=COALESCE($12,medical_notes),
        updated_at=NOW()
      WHERE id=$13 AND school_id=$14 RETURNING *`,
      [firstName||null, lastName||null, otherNames||null, gender||null, dateOfBirth||null,
       classId||null, isBoarding, dormName||null, bloodGroup||null, photoUrl||null,
       isActive, medicalNotes||null, req.params.id, req.schoolId]);
    if (!rows.length) return res.status(404).json({ error: 'Student not found' });
    res.json(rows[0]);
  } catch (e) { res.status(500).json({ error: e.message }); }
};

const promoteStudents = async (req, res) => {
  try {
    const { classId, toClassId, studentIds } = req.body;
    if ((!classId && !studentIds?.length) || !toClassId) {
      return res.status(400).json({ error: 'fromClass or studentIds and toClass required' });
    }
    let promoted = 0;
    await withTransaction(async (client) => {
      let targets;
      if (studentIds?.length) {
        targets = studentIds;
      } else {
        const { rows } = await client.query('SELECT id FROM students WHERE current_class_id=$1 AND school_id=$2 AND is_active=true', [classId, req.schoolId]);
        targets = rows.map(r => r.id);
      }
      for (const sid of targets) {
        const prev = await client.query('SELECT current_class_id FROM students WHERE id=$1', [sid]);
        await client.query('UPDATE students SET current_class_id=$1, updated_at=NOW() WHERE id=$2', [toClassId, sid]);
        await client.query("INSERT INTO student_class_history(student_id, class_id, from_class_id, school_id, action) VALUES($1,$2,$3,$4,'promoted')",
          [sid, toClassId, prev.rows[0]?.current_class_id, req.schoolId]).catch(()=>{});
        promoted++;
      }
    });
    res.json({ promoted, message: `${promoted} students promoted` });
  } catch (e) { res.status(500).json({ error: e.message }); }
};

const getStudentFeeHistory = async (req, res) => {
  try {
    const { rows } = await query(`
      SELECT fp.id, fp.receipt_number, fp.amount, fp.payment_method,
             fp.payment_date, fp.mpesa_receipt, fp.bank_reference, fp.notes,
             fp.created_at, u.first_name || ' ' || u.last_name as recorded_by
      FROM fee_payments fp LEFT JOIN users u ON u.id = fp.recorded_by
      WHERE fp.student_id=$1 AND fp.school_id=$2 AND fp.status='completed'
      ORDER BY fp.payment_date DESC`, [req.params.id, req.schoolId]);
    res.json(rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
};

const getStudentAcademicHistory = async (req, res) => {
  try {
    const { rows } = await query(`
      SELECT es.name as exam_name, es.type, es.start_date,
             sub.name as subject_name, sub.code,
             sm.marks, sm.grade, sm.points, sm.is_absent, sm.teacher_remarks
      FROM student_marks sm
      JOIN exam_papers ep ON ep.id = sm.exam_paper_id
      JOIN exam_series es ON es.id = ep.exam_series_id
      JOIN subjects sub ON sub.id = ep.subject_id
      WHERE sm.student_id=$1 AND ep.school_id=$2
      ORDER BY es.start_date DESC, sub.name`, [req.params.id, req.schoolId]);
    res.json(rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
};

const deactivateStudent = async (req, res) => {
  try {
    const { reason } = req.body;
    const { rows } = await query('UPDATE students SET is_active=false, updated_at=NOW() WHERE id=$1 AND school_id=$2 RETURNING *',
      [req.params.id, req.schoolId]);
    if (!rows.length) return res.status(404).json({ error: 'Student not found' });
    res.json({ success: true, student: rows[0] });
  } catch (e) { res.status(500).json({ error: e.message }); }
};

const updateParent = async (req, res) => {
  try {
    const { firstName, lastName, phone, email, relationship, occupation, isPrimary } = req.body;
    const { rows } = await query(`
      UPDATE student_parents SET first_name=COALESCE($1,first_name), last_name=COALESCE($2,last_name),
        phone=COALESCE($3,phone), email=COALESCE($4,email),
        relationship=COALESCE($5,relationship), occupation=COALESCE($6,occupation),
        is_primary=COALESCE($7,is_primary)
      WHERE id=$8 AND student_id=$9 RETURNING *`,
      [firstName||null, lastName||null, phone||null, email||null,
       relationship||null, occupation||null, isPrimary, req.params.parentId, req.params.id]);
    if (!rows.length) return res.status(404).json({ error: 'Parent not found' });
    res.json(rows[0]);
  } catch (e) { res.status(500).json({ error: e.message }); }
};

const bulkImport = async (req, res) => {
  try {
    const { students } = req.body;
    if (!Array.isArray(students)) return res.status(400).json({ error: 'students array required' });
    let created = 0, skipped = 0, errors = [];
    for (const s of students) {
      try {
        const exists = await query('SELECT id FROM students WHERE admission_number=$1 AND school_id=$2', [s.admissionNumber, req.schoolId]);
        if (exists.rows.length) { skipped++; continue; }
        await query(`INSERT INTO students(school_id,first_name,last_name,admission_number,gender,current_class_id,admission_date,is_boarding)
          VALUES($1,$2,$3,$4,$5,$6,$7,$8)`,
          [req.schoolId, s.firstName, s.lastName, s.admissionNumber, s.gender||'male',
           s.classId, s.admissionDate||new Date().toISOString().split('T')[0], s.isBoarding||false]);
        created++;
      } catch (err) { errors.push({ admissionNumber: s.admissionNumber, error: err.message }); }
    }
    res.json({ created, skipped, errors, total: students.length });
  } catch (e) { res.status(500).json({ error: e.message }); }
};

module.exports = {
  getStudents, getStudent, createStudent, updateStudent,
  promoteStudents, deactivateStudent, updateParent, bulkImport,
  getStudentFeeHistory, getStudentAcademicHistory,
};
