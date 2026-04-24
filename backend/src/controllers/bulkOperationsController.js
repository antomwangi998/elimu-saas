// ============================================================
// bulkOperationsController — Bulk import/operations
// ============================================================
const { query, withTransaction } = require('../config/database');

// GET — list recent bulk operations
exports.getAll = async (req, res) => {
  try {
    const { rows } = await query(`
      SELECT al.id, al.action, al.created_at,
             u.first_name||' '||u.last_name as initiated_by,
             al.new_data->>'count' as record_count,
             al.new_data->>'status' as status,
             al.entity_type
      FROM audit_logs al
      LEFT JOIN users u ON u.id=al.user_id
      WHERE al.school_id=$1 AND al.action LIKE 'bulk_%'
      ORDER BY al.created_at DESC LIMIT 20`, [req.schoolId]);
    res.json({ data: rows, total: rows.length });
  } catch (e) { res.status(500).json({ error: e.message }); }
};

// POST /bulk-ops/students — bulk promote students
exports.promoteStudents = async (req, res) => {
  try {
    const { fromClassId, toClassId, studentIds } = req.body;
    if (!fromClassId || !toClassId) return res.status(400).json({ error: 'fromClassId and toClassId required' });
    const ids = studentIds?.length
      ? studentIds
      : (await query('SELECT id FROM students WHERE current_class_id=$1 AND school_id=$2 AND is_active=true',
          [fromClassId, req.schoolId])).rows.map(r => r.id);
    if (!ids.length) return res.json({ message: 'No students to promote', promoted: 0 });
    await query(
      `UPDATE students SET current_class_id=$1 WHERE id=ANY($2::uuid[]) AND school_id=$3`,
      [toClassId, ids, req.schoolId]);
    await query(
      `INSERT INTO audit_logs(school_id,user_id,action,entity_type,new_data)
       VALUES($1,$2,'bulk_promote','students',$3)`,
      [req.schoolId, req.user.id, JSON.stringify({ count: ids.length, fromClass: fromClassId, toClass: toClassId, status: 'done' })]);
    res.json({ message: `${ids.length} students promoted`, promoted: ids.length });
  } catch (e) { res.status(500).json({ error: e.message }); }
};

// POST /bulk-ops/fees — bulk assign fee structure
exports.bulkAssignFees = async (req, res) => {
  try {
    const { feeStructureId, classId } = req.body;
    if (!feeStructureId || !classId) return res.status(400).json({ error: 'feeStructureId and classId required' });
    const { rows: fs } = await query(
      'SELECT COALESCE(SUM(amount),0) as total FROM fee_items WHERE fee_structure_id=$1',
      [feeStructureId]);
    const total = parseFloat(fs[0]?.total || 0);
    const { rows: students } = await query(
      'SELECT id FROM students WHERE current_class_id=$1 AND school_id=$2 AND is_active=true',
      [classId, req.schoolId]);
    let assigned = 0;
    for (const s of students) {
      await query(
        `INSERT INTO student_fee_assignments(student_id,fee_structure_id,school_id,total_fees)
         VALUES($1,$2,$3,$4) ON CONFLICT(student_id,fee_structure_id) DO UPDATE SET total_fees=$4`,
        [s.id, feeStructureId, req.schoolId, total]);
      assigned++;
    }
    res.json({ message: `Fee structure assigned to ${assigned} students`, assigned });
  } catch (e) { res.status(500).json({ error: e.message }); }
};

// POST /bulk-ops/attendance — mark bulk attendance
exports.bulkAttendance = async (req, res) => {
  try {
    const { classId, date, status = 'present', studentIds } = req.body;
    if (!classId || !date) return res.status(400).json({ error: 'classId and date required' });
    const ids = studentIds?.length
      ? studentIds
      : (await query('SELECT id FROM students WHERE current_class_id=$1 AND school_id=$2 AND is_active=true',
          [classId, req.schoolId])).rows.map(r => r.id);
    let marked = 0;
    for (const id of ids) {
      await query(
        `INSERT INTO attendance_records(student_id,school_id,class_id,date,status,marked_by)
         VALUES($1,$2,$3,$4,$5,$6)
         ON CONFLICT(student_id,date) DO UPDATE SET status=$5,marked_by=$6`,
        [id, req.schoolId, classId, date, status, req.user.id]);
      marked++;
    }
    res.json({ message: `Marked ${marked} students as ${status}`, marked });
  } catch (e) { res.status(500).json({ error: e.message }); }
};

exports.getOne = (req, res) => res.json({ endpoints: ['/promote','/fees','/attendance'] });
exports.create = exports.promoteStudents;
exports.update = (req, res) => res.status(405).json({ error: 'Use specific endpoints' });
exports.remove = (req, res) => res.status(405).json({ error: 'Use specific endpoints' });
