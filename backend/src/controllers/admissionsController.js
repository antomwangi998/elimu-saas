// ============================================================
// Admissions Controller
// Admission teacher: registers classes, generates student ID
// cards, registers students to KNEC portal for national exams
// ============================================================
const { query, withTransaction, paginatedQuery } = require('../config/database');
const { cache } = require('../config/redis');
const documentService = require('../services/documentService');

// ── Guards ────────────────────────────────────────────────────
const ADMISSION_ROLES = ['admission_teacher', 'school_admin', 'principal', 'deputy_principal', 'super_admin'];
const checkAdmission = (req, res) => {
  if (!ADMISSION_ROLES.includes(req.user.role)) {
    res.status(403).json({ error: 'Only the Admission Teacher can perform this action' });
    return false;
  }
  return true;
};

// ============================================================
// CLASS MANAGEMENT
// ============================================================

// GET /api/admissions/classes
const getClasses = async (req, res) => {
  const { includeInactive } = req.query;
  const { rows } = await query(
    `SELECT c.*,
            u.first_name||' '||u.last_name as class_teacher_name,
            COUNT(s.id) FILTER (WHERE s.is_active=true) as student_count,
            COUNT(s.id) FILTER (WHERE s.is_active=true AND s.gender='male') as boys,
            COUNT(s.id) FILTER (WHERE s.is_active=true AND s.gender='female') as girls,
            CASE WHEN c.level <= 2 THEN 'CBC' ELSE '8-4-4' END as curriculum
     FROM classes c
     LEFT JOIN users u ON c.class_teacher_id=u.id
     LEFT JOIN students s ON s.current_class_id=c.id AND s.school_id=c.school_id
     WHERE c.school_id=$1 ${includeInactive ? '' : 'AND c.is_active=true'}
     GROUP BY c.id, u.first_name, u.last_name
     ORDER BY c.level, c.stream`,
    [req.schoolId]
  );
  res.json(rows);
};

// POST /api/admissions/classes
const createClass = async (req, res) => {
  if (!checkAdmission(req, res)) return;
  const { name, level, stream, classTeacherId, capacity } = req.body;
  if (!name || !level) return res.status(400).json({ error: 'name and level required' });

  const curriculum = level <= 2 ? 'CBC' : '8-4-4';
  const label = `Form ${level}${stream ? ' ' + stream : ''}`;

  const { rows } = await query(
    `INSERT INTO classes(school_id, name, level, stream, class_teacher_id, capacity, label)
     VALUES($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
    [req.schoolId, name, level, stream, classTeacherId, capacity || 45, label]
  );
  res.status(201).json({ ...rows[0], curriculum });
};

// PUT /api/admissions/classes/:id
const updateClass = async (req, res) => {
  if (!checkAdmission(req, res)) return;
  const { name, level, stream, classTeacherId, capacity, isActive } = req.body;
  const { rows } = await query(
    `UPDATE classes SET name=$1, level=$2, stream=$3, class_teacher_id=$4,
       capacity=$5, is_active=$6, label=$7, updated_at=NOW()
     WHERE id=$8 AND school_id=$9 RETURNING *`,
    [name, level, stream, classTeacherId, capacity,
     isActive, `Form ${level}${stream ? ' ' + stream : ''}`,
     req.params.id, req.schoolId]
  );
  if (!rows.length) return res.status(404).json({ error: 'Class not found' });
  res.json(rows[0]);
};

// POST /api/admissions/classes/:id/assign-teacher
const assignClassTeacher = async (req, res) => {
  if (!checkAdmission(req, res)) return;
  const { teacherId } = req.body;

  // Verify teacher exists in this school
  const { rows: teacherRows } = await query(
    'SELECT u.id, u.first_name, u.last_name FROM users u WHERE u.id=$1 AND u.school_id=$2',
    [teacherId, req.schoolId]
  );
  if (!teacherRows.length) return res.status(404).json({ error: 'Teacher not found' });

  const { rows } = await query(
    'UPDATE classes SET class_teacher_id=$1 WHERE id=$2 AND school_id=$3 RETURNING *',
    [teacherId, req.params.id, req.schoolId]
  );
  res.json({ ...rows[0], classTeacher: teacherRows[0] });
};

// ============================================================
// STUDENT ID CARDS
// ============================================================

// POST /api/admissions/id-cards/generate
const generateIdCards = async (req, res) => {
  if (!checkAdmission(req, res)) return;
  const { studentIds, academicYear, printAll = false, classId } = req.body;

  let targetStudentIds = studentIds || [];

  if (printAll || classId) {
    const { rows } = await query(
      `SELECT s.id FROM students s
       WHERE s.school_id=$1 AND s.is_active=true
       ${classId ? 'AND s.current_class_id=$2' : ''}`,
      classId ? [req.schoolId, classId] : [req.schoolId]
    );
    targetStudentIds = rows.map(r => r.id);
  }

  if (!targetStudentIds.length) return res.status(400).json({ error: 'No students specified' });

  const currentYear = academicYear || new Date().getFullYear();
  const cardRecords = [];

  await withTransaction(async (client) => {
    for (const studentId of targetStudentIds) {
      const cardNum = `ID-${req.schoolId.slice(0, 4).toUpperCase()}-${currentYear}-${
        Math.floor(Math.random() * 90000 + 10000)}`;
      const expiryDate = `${currentYear + 1}-01-31`; // expires Jan of next year

      const { rows } = await client.query(
        `INSERT INTO student_id_cards(school_id, student_id, academic_year, card_number, generated_by, expiry_date)
         VALUES($1,$2,$3,$4,$5,$6)
         ON CONFLICT(student_id, academic_year) DO UPDATE SET
           card_number=$4, generated_by=$5, generated_at=NOW(), printed=false
         RETURNING *`,
        [req.schoolId, studentId, currentYear, cardNum, req.user.id, expiryDate]
      );
      cardRecords.push(rows[0]);
    }
  });

  // Fetch full student data for PDF
  const { rows: students } = await query(
    `SELECT s.id, s.first_name, s.last_name, s.admission_number, s.gender,
            s.date_of_birth, s.photo_url, s.blood_group,
            c.name as class_name, c.level,
            ic.card_number, ic.expiry_date, ic.academic_year,
            sch.name as school_name, sch.logo_url, sch.address, sch.phone as school_phone,
            sp.phone as parent_phone, sp.first_name as parent_name
     FROM students s
     LEFT JOIN classes c ON s.current_class_id=c.id
     LEFT JOIN student_id_cards ic ON ic.student_id=s.id AND ic.academic_year=$1
     LEFT JOIN schools sch ON s.school_id=sch.id
     LEFT JOIN student_parents sp ON sp.student_id=s.id AND sp.is_primary=true
     WHERE s.id=ANY($2) AND s.school_id=$3`,
    [currentYear, targetStudentIds, req.schoolId]
  );

  const pdf = await documentService.generateIdCardsPdf(students);

  // Mark as printed
  await query(
    `UPDATE student_id_cards SET printed=true, printed_at=NOW()
     WHERE student_id=ANY($1) AND academic_year=$2 AND school_id=$3`,
    [targetStudentIds, currentYear, req.schoolId]
  );

  res.set('Content-Type', 'application/pdf');
  res.set('Content-Disposition', `attachment; filename="student-id-cards-${currentYear}.pdf"`);
  res.send(pdf);
};

// GET /api/admissions/id-cards
const getIdCards = async (req, res) => {
  const { academicYear, classId, printed } = req.query;
  const year = academicYear || new Date().getFullYear();

  const { rows } = await query(
    `SELECT ic.*, s.first_name, s.last_name, s.admission_number, s.photo_url,
            c.name as class_name
     FROM student_id_cards ic
     JOIN students s ON ic.student_id=s.id
     LEFT JOIN classes c ON s.current_class_id=c.id
     WHERE ic.school_id=$1 AND ic.academic_year=$2
     ${classId ? 'AND s.current_class_id=$3' : ''}
     ${printed !== undefined ? `AND ic.printed=${printed === 'true'}` : ''}
     ORDER BY c.level, s.first_name`,
    [req.schoolId, year, ...(classId ? [classId] : [])]
  );
  res.json(rows);
};

// ============================================================
// KNEC REGISTRATION
// ============================================================

// GET /api/admissions/knec/students?examType=kcse&academicYear=2025
const getKnecCandidates = async (req, res) => {
  const { examType = 'kcse', academicYear } = req.query;
  const year = academicYear || new Date().getFullYear();

  // KCSE candidates are Form 4 students
  const targetLevel = examType === 'kcse' ? 4 : 2;

  const { rows } = await query(
    `SELECT s.id, s.admission_number, s.first_name, s.last_name, s.other_names,
            s.gender, s.date_of_birth, s.nationality, s.county,
            s.kcpe_index_number, s.kcse_index_number,
            c.name as class_name, c.level,
            kr.id as registration_id, kr.knec_index_number,
            kr.centre_number, kr.registration_status,
            kr.subjects as registered_subjects, kr.submitted_at,
            sp.first_name as parent_name, sp.phone as parent_phone
     FROM students s
     JOIN classes c ON s.current_class_id=c.id
     LEFT JOIN knec_registrations kr ON kr.student_id=s.id
       AND kr.exam_type=$1 AND kr.academic_year=$2
     LEFT JOIN student_parents sp ON sp.student_id=s.id AND sp.is_primary=true
     WHERE s.school_id=$3 AND c.level=$4 AND s.is_active=true
     ORDER BY s.first_name, s.last_name`,
    [examType, year, req.schoolId, targetLevel]
  );
  res.json(rows);
};

// POST /api/admissions/knec/register — register a student for KNEC
const registerForKnec = async (req, res) => {
  if (!checkAdmission(req, res)) return;
  const {
    studentId, examType, academicYear, knecIndexNumber,
    centreNumber, subjects,
  } = req.body;

  if (!studentId || !examType) return res.status(400).json({ error: 'studentId and examType required' });

  const year = academicYear || new Date().getFullYear();

  // Verify student is the right level
  const { rows: studentRows } = await query(
    `SELECT s.*, c.level FROM students s LEFT JOIN classes c ON s.current_class_id=c.id
     WHERE s.id=$1 AND s.school_id=$2`,
    [studentId, req.schoolId]
  );
  if (!studentRows.length) return res.status(404).json({ error: 'Student not found' });

  const student = studentRows[0];
  if (examType === 'kcse' && student.level !== 4) {
    return res.status(400).json({ error: 'KCSE registration only for Form 4 students' });
  }

  const { rows } = await query(
    `INSERT INTO knec_registrations(
       school_id, student_id, exam_type, academic_year,
       knec_index_number, centre_number, subjects, submitted_by
     ) VALUES($1,$2,$3,$4,$5,$6,$7,$8)
     ON CONFLICT(student_id, exam_type, academic_year) DO UPDATE SET
       knec_index_number=$5, centre_number=$6, subjects=$7,
       submitted_by=$8, updated_at=NOW()
     RETURNING *`,
    [
      req.schoolId, studentId, examType, year,
      knecIndexNumber, centreNumber,
      JSON.stringify(subjects || []), req.user.id,
    ]
  );

  // Update student's KNEC index number
  if (knecIndexNumber) {
    const field = examType === 'kcse' ? 'kcse_index_number' : 'kcpe_index_number';
    await query(`UPDATE students SET ${field}=$1 WHERE id=$2`, [knecIndexNumber, studentId]);
  }

  res.status(201).json(rows[0]);
};

// POST /api/admissions/knec/bulk-register — bulk register whole class
const bulkRegisterKnec = async (req, res) => {
  if (!checkAdmission(req, res)) return;
  const { classId, examType, academicYear, centreNumber } = req.body;
  if (!classId || !examType) return res.status(400).json({ error: 'classId and examType required' });

  const year = academicYear || new Date().getFullYear();

  // Get students with their selected subjects
  const { rows: students } = await query(
    `SELECT s.id, s.admission_number, s.first_name, s.last_name
     FROM students s WHERE s.current_class_id=$1 AND s.school_id=$2 AND s.is_active=true`,
    [classId, req.schoolId]
  );

  let registered = 0;
  for (const student of students) {
    // Get their subject selections
    const { rows: subjectRows } = await query(
      `SELECT sub.code, sub.knec_code, sub.name
       FROM student_subject_selections sss
       JOIN subjects sub ON sss.subject_id=sub.id
       WHERE sss.student_id=$1 AND sss.school_id=$2`,
      [student.id, req.schoolId]
    );

    await query(
      `INSERT INTO knec_registrations(
         school_id, student_id, exam_type, academic_year,
         centre_number, subjects, registration_status, submitted_by
       ) VALUES($1,$2,$3,$4,$5,$6,'pending',$7)
       ON CONFLICT(student_id, exam_type, academic_year) DO UPDATE SET
         centre_number=$5, subjects=$6, submitted_by=$7, updated_at=NOW()`,
      [
        req.schoolId, student.id, examType, year,
        centreNumber, JSON.stringify(subjectRows), req.user.id,
      ]
    );
    registered++;
  }

  res.json({
    message: `${registered} students registered for ${examType.toUpperCase()} ${year}`,
    registered,
  });
};

// PUT /api/admissions/knec/:registrationId/submit
const submitKnecRegistration = async (req, res) => {
  if (!checkAdmission(req, res)) return;
  const { rows } = await query(
    `UPDATE knec_registrations
     SET registration_status='submitted', submitted_at=NOW(), submitted_by=$1
     WHERE id=$2 AND school_id=$3 RETURNING *`,
    [req.user.id, req.params.registrationId, req.schoolId]
  );
  if (!rows.length) return res.status(404).json({ error: 'Registration not found' });
  res.json(rows[0]);
};

// POST /api/admissions/knec/bulk-submit — submit all pending for a class/year
const bulkSubmitKnec = async (req, res) => {
  if (!checkAdmission(req, res)) return;
  const { examType, academicYear, classId } = req.body;
  const year = academicYear || new Date().getFullYear();

  const { rows } = await query(
    `UPDATE knec_registrations kr SET registration_status='submitted', submitted_at=NOW(), submitted_by=$1
     FROM students s
     WHERE kr.student_id=s.id AND kr.school_id=$2 AND kr.exam_type=$3 AND kr.academic_year=$4
       AND kr.registration_status='pending'
       ${classId ? 'AND s.current_class_id=$5' : ''}
     RETURNING kr.id`,
    [req.user.id, req.schoolId, examType, year, ...(classId ? [classId] : [])]
  );

  res.json({ message: `${rows.length} registrations submitted to KNEC`, count: rows.length });
};

// GET /api/admissions/knec/report — KNEC registration report
const getKnecReport = async (req, res) => {
  const { examType, academicYear } = req.query;
  const year = academicYear || new Date().getFullYear();

  const { rows } = await query(
    `SELECT kr.registration_status, COUNT(*) as count
     FROM knec_registrations kr
     WHERE kr.school_id=$1 AND kr.exam_type=$2 AND kr.academic_year=$3
     GROUP BY kr.registration_status`,
    [req.schoolId, examType || 'kcse', year]
  );

  const { rows: details } = await query(
    `SELECT kr.*, s.first_name, s.last_name, s.admission_number,
            c.name as class_name, u.first_name||' '||u.last_name as submitted_by_name
     FROM knec_registrations kr
     JOIN students s ON kr.student_id=s.id
     LEFT JOIN classes c ON s.current_class_id=c.id
     LEFT JOIN users u ON kr.submitted_by=u.id
     WHERE kr.school_id=$1 AND kr.exam_type=$2 AND kr.academic_year=$3
     ORDER BY kr.registration_status, s.first_name`,
    [req.schoolId, examType || 'kcse', year]
  );

  res.json({ summary: rows, details, examType: examType || 'kcse', academicYear: year });
};

module.exports = {
  getClasses, createClass, updateClass, assignClassTeacher,
  generateIdCards, getIdCards,
  getKnecCandidates, registerForKnec, bulkRegisterKnec,
  submitKnecRegistration, bulkSubmitKnec, getKnecReport,
};
