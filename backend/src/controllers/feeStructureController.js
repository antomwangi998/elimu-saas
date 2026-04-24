// ============================================================
// feeStructureController — Fee structures, items, assignments
// ============================================================
const { query } = require('../config/database');

// GET /api/fee-structure — list all structures for this school
exports.getAll = async (req, res) => {
  try {
    const { classId, term, active } = req.query;
    let sql = `
      SELECT fs.*, c.name as class_name,
             COUNT(fi.id) as items_count,
             COALESCE(SUM(fi.amount) FILTER (WHERE fi.is_mandatory), 0) as mandatory_total,
             COALESCE(SUM(fi.amount), 0) as total_amount
      FROM fee_structures fs
      LEFT JOIN classes c ON c.id = fs.class_id
      LEFT JOIN fee_items fi ON fi.fee_structure_id = fs.id
      WHERE fs.school_id = $1`;
    const params = [req.schoolId];
    let i = 2;
    if (classId) { sql += ` AND (fs.class_id=$${i++} OR fs.applies_to_all_classes=true)`; params.push(classId); }
    if (active !== undefined) { sql += ` AND fs.is_active=$${i++}`; params.push(active === 'true'); }
    sql += ' GROUP BY fs.id, c.name ORDER BY fs.created_at DESC';
    const { rows } = await query(sql, params);
    res.json({ data: rows, total: rows.length });
  } catch (e) { res.status(500).json({ error: e.message }); }
};

// GET /api/fee-structure/:id
exports.getOne = async (req, res) => {
  try {
    const { rows: fs } = await query(
      `SELECT fs.*, c.name as class_name FROM fee_structures fs
       LEFT JOIN classes c ON c.id=fs.class_id
       WHERE fs.id=$1 AND fs.school_id=$2`, [req.params.id, req.schoolId]);
    if (!fs.length) return res.status(404).json({ error: 'Not found' });
    const { rows: items } = await query(
      'SELECT * FROM fee_items WHERE fee_structure_id=$1 ORDER BY sort_order, name',
      [req.params.id]);
    res.json({ ...fs[0], items });
  } catch (e) { res.status(500).json({ error: e.message }); }
};

// POST /api/fee-structure
exports.create = async (req, res) => {
  try {
    const { name, classId, term, items = [], appliesToAllClasses } = req.body;
    if (!name) return res.status(400).json({ error: 'name required' });
    const { rows } = await query(
      `INSERT INTO fee_structures(school_id, class_id, name, applies_to_all_classes, is_active, created_by)
       VALUES($1,$2,$3,$4,true,$5) RETURNING *`,
      [req.schoolId, classId||null, name, !!appliesToAllClasses, req.user.id]);
    const fs = rows[0];
    // Insert fee items
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      await query(
        `INSERT INTO fee_items(fee_structure_id, school_id, category, name, amount, is_mandatory, sort_order)
         VALUES($1,$2,$3,$4,$5,$6,$7)`,
        [fs.id, req.schoolId, item.category||'tuition', item.name, item.amount||0, item.isMandatory!==false, i]);
    }
    res.status(201).json({ message: 'Fee structure created', id: fs.id, ...fs });
  } catch (e) { res.status(500).json({ error: e.message }); }
};

// PUT /api/fee-structure/:id
exports.update = async (req, res) => {
  try {
    const { name, classId, isActive, appliesToAllClasses } = req.body;
    const { rows } = await query(
      `UPDATE fee_structures SET name=COALESCE($1,name), class_id=COALESCE($2,class_id),
       is_active=COALESCE($3,is_active), applies_to_all_classes=COALESCE($4,applies_to_all_classes)
       WHERE id=$5 AND school_id=$6 RETURNING *`,
      [name||null, classId||null, isActive, appliesToAllClasses, req.params.id, req.schoolId]);
    if (!rows.length) return res.status(404).json({ error: 'Not found' });
    res.json({ message: 'Updated', ...rows[0] });
  } catch (e) { res.status(500).json({ error: e.message }); }
};

// DELETE /api/fee-structure/:id
exports.remove = async (req, res) => {
  try {
    const { rows } = await query(
      `DELETE FROM fee_structures WHERE id=$1 AND school_id=$2 RETURNING id`,
      [req.params.id, req.schoolId]);
    if (!rows.length) return res.status(404).json({ error: 'Not found' });
    res.json({ message: 'Deleted' });
  } catch (e) { res.status(500).json({ error: e.message }); }
};

// POST /api/fee-structure/:id/assign — assign to all students in a class
exports.assignToClass = async (req, res) => {
  try {
    const { classId, academicYearId, termId } = req.body;
    if (!classId) return res.status(400).json({ error: 'classId required' });
    // Get fee structure total
    const { rows: fs } = await query(
      `SELECT COALESCE(SUM(fi.amount),0) as total FROM fee_items fi
       WHERE fi.fee_structure_id=$1 AND fi.school_id=$2`, [req.params.id, req.schoolId]);
    const total = parseFloat(fs[0]?.total || 0);
    // Get students in class
    const { rows: students } = await query(
      'SELECT id FROM students WHERE current_class_id=$1 AND school_id=$2 AND is_active=true',
      [classId, req.schoolId]);
    let assigned = 0;
    for (const s of students) {
      await query(
        `INSERT INTO student_fee_assignments(student_id, fee_structure_id, school_id, academic_year_id, term_id, total_fees)
         VALUES($1,$2,$3,$4,$5,$6)
         ON CONFLICT(student_id, fee_structure_id) DO UPDATE SET total_fees=$6`,
        [s.id, req.params.id, req.schoolId, academicYearId||null, termId||null, total]);
      assigned++;
    }
    res.json({ message: `Assigned to ${assigned} students`, assigned, total });
  } catch (e) { res.status(500).json({ error: e.message }); }
};
