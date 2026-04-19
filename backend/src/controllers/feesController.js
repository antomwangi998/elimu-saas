// ============================================================
// Fees Controller — Complete Financial Management
// Structures · Payments · M-Pesa · Statements
// Defaulters · Aging · Receipts · Bulk SMS
// ============================================================
const { query, withTransaction, paginatedQuery } = require('../config/database');
const mpesaService = require('../services/mpesaService');
const smsService   = require('../services/smsService');
const pdfService   = require('../services/pdfService');
const { cache }    = require('../config/redis');

// ── Fee Structures ────────────────────────────────────────────
const getFeeStructures = async (req, res) => {
  try {
    const { rows } = await query(`
      SELECT fs.*, c.name as class_name,
             COUNT(fi.id) as items_count,
             COALESCE(SUM(fi.amount),0) as total_amount
      FROM fee_structures fs
      LEFT JOIN classes c ON c.id = fs.class_id
      LEFT JOIN fee_items fi ON fi.fee_structure_id = fs.id
      WHERE fs.school_id=$1
      GROUP BY fs.id, c.name ORDER BY fs.is_active DESC, fs.created_at DESC`,
      [req.schoolId]);
    res.json(rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
};

const getFeeStructure = async (req, res) => {
  try {
    const { rows } = await query('SELECT * FROM fee_structures WHERE id=$1 AND school_id=$2', [req.params.id, req.schoolId]);
    if (!rows.length) return res.status(404).json({ error: 'Fee structure not found' });
    const { rows: items } = await query('SELECT * FROM fee_items WHERE fee_structure_id=$1 ORDER BY sort_order, name', [req.params.id]);
    res.json({ ...rows[0], items });
  } catch (e) { res.status(500).json({ error: e.message }); }
};

const createFeeStructure = async (req, res) => {
  try {
    const { name, classId, academicYearId, termId, items = [], dueDate, isActive } = req.body;
    if (!name) return res.status(400).json({ error: 'name required' });
    await withTransaction(async (client) => {
      const { rows } = await client.query(`
        INSERT INTO fee_structures(school_id, name, class_id, academic_year_id, term_id, due_date, is_active, created_by)
        VALUES($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
        [req.schoolId, name, classId||null, academicYearId||null, termId||null, dueDate||null, isActive !== false, req.user.id]);
      for (let i = 0; i < items.length; i++) {
        await client.query('INSERT INTO fee_items(fee_structure_id, school_id, name, amount, is_mandatory, sort_order) VALUES($1,$2,$3,$4,$5,$6)',
          [rows[0].id, req.schoolId, items[i].name, items[i].amount||0, items[i].isMandatory !== false, i]);
      }
      res.status(201).json(rows[0]);
    });
  } catch (e) { res.status(500).json({ error: e.message }); }
};

const assignFeesToStudents = async (req, res) => {
  try {
    const { feeStructureId, classId } = req.body;
    if (!feeStructureId) return res.status(400).json({ error: 'feeStructureId required' });
    const { rows: structure } = await query(`
      SELECT fs.*, COALESCE(SUM(fi.amount),0) as total
      FROM fee_structures fs LEFT JOIN fee_items fi ON fi.fee_structure_id=fs.id
      WHERE fs.id=$1 AND fs.school_id=$2 GROUP BY fs.id`, [feeStructureId, req.schoolId]);
    if (!structure.length) return res.status(404).json({ error: 'Structure not found' });
    let students;
    if (classId) {
      const { rows } = await query('SELECT id FROM students WHERE current_class_id=$1 AND school_id=$2 AND is_active=true', [classId, req.schoolId]);
      students = rows;
    } else if (structure[0].class_id) {
      const { rows } = await query('SELECT id FROM students WHERE current_class_id=$1 AND school_id=$2 AND is_active=true', [structure[0].class_id, req.schoolId]);
      students = rows;
    } else {
      const { rows } = await query('SELECT id FROM students WHERE school_id=$1 AND is_active=true', [req.schoolId]);
      students = rows;
    }
    let assigned = 0;
    for (const s of students) {
      await query(`INSERT INTO student_fee_assignments(student_id, fee_structure_id, school_id, gross_fees, net_fees)
        VALUES($1,$2,$3,$4,$4) ON CONFLICT(student_id, fee_structure_id) DO NOTHING`,
        [s.id, feeStructureId, req.schoolId, structure[0].total]).catch(()=>{});
      assigned++;
    }
    res.json({ assigned, total: structure[0].total, message: `Fees assigned to ${assigned} students` });
  } catch (e) { res.status(500).json({ error: e.message }); }
};

// ── Payments ──────────────────────────────────────────────────
const getPayments = async (req, res) => {
  try {
    const { page=1, limit=30, search, classId, from, to, method } = req.query;
    let sql = `SELECT fp.*, s.first_name, s.last_name, s.admission_number,
                 c.name as class_name, u.first_name || ' ' || u.last_name as recorded_by_name
               FROM fee_payments fp JOIN students s ON fp.student_id=s.id
               LEFT JOIN classes c ON c.id = s.current_class_id
               LEFT JOIN users u ON u.id = fp.recorded_by
               WHERE fp.school_id=$1 AND fp.status='completed'`;
    const params = [req.schoolId]; let p = 2;
    if (classId) { sql += ` AND s.current_class_id=$${p++}`; params.push(classId); }
    if (method)  { sql += ` AND fp.payment_method::text ILIKE $${p++}`; params.push(method); }
    if (from)    { sql += ` AND fp.payment_date >= $${p++}`; params.push(from); }
    if (to)      { sql += ` AND fp.payment_date <= $${p++}`; params.push(to); }
    if (search)  { sql += ` AND (s.first_name ILIKE $${p} OR s.last_name ILIKE $${p} OR s.admission_number ILIKE $${p} OR fp.receipt_number ILIKE $${p} OR fp.mpesa_receipt ILIKE $${p})`; params.push(`%${search}%`); p++; }
    sql += ' ORDER BY fp.payment_date DESC, fp.created_at DESC';
    const result = await paginatedQuery(sql, params, parseInt(page), parseInt(limit));
    res.json(result);
  } catch (e) { res.status(500).json({ error: e.message }); }
};

const recordPayment = async (req, res) => {
  try {
    const { studentId, amount, paymentMethod, mpesaReceipt, bankReference, paymentDate, notes, feeStructureId } = req.body;
    if (!studentId || !amount || parseFloat(amount) <= 0) return res.status(400).json({ error: 'studentId and amount required' });

    const receiptNumber = 'RCP-' + Date.now().toString().slice(-8);
    const { rows } = await query(`
      INSERT INTO fee_payments(school_id, student_id, fee_structure_id, receipt_number, amount, payment_method,
        mpesa_receipt, bank_reference, payment_date, notes, status, recorded_by)
      VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,'completed',$11) RETURNING *`,
      [req.schoolId, studentId, feeStructureId||null, receiptNumber, parseFloat(amount),
       paymentMethod||'cash', mpesaReceipt||null, bankReference||null,
       paymentDate||new Date().toISOString().split('T')[0], notes||null, req.user.id]);

    // Notify parent
    const { rows: parent } = await query(`
      SELECT sp.phone FROM student_parents sp WHERE sp.student_id=$1 AND sp.is_primary=true LIMIT 1`,
      [studentId]).catch(()=>({rows:[]}));
    if (parent[0]?.phone) {
      const { rows: stu } = await query('SELECT first_name, last_name FROM students WHERE id=$1', [studentId]).catch(()=>({rows:[{}]}));
      smsService.sendSms({ to: [parent[0].phone], message: `Payment of KES ${amount} received for ${stu[0]?.first_name||'your child'}. Receipt: ${receiptNumber}. Thank you.` }).catch(()=>{});
    }
    res.status(201).json(rows[0]);
  } catch (e) { res.status(500).json({ error: e.message }); }
};

const initiateMpesaSTK = async (req, res) => {
  try {
    const { phone, amount, studentId, studentName } = req.body;
    if (!phone || !amount || !studentId) return res.status(400).json({ error: 'phone, amount, studentId required' });
    const result = await mpesaService.stkPush({ phone, amount: parseInt(amount), accountRef: studentId.slice(0,12), description: `School fees for ${studentName||'student'}` });
    if (result.ResponseCode === '0') {
      await query(`INSERT INTO mpesa_stk_requests(school_id, student_id, phone, amount, checkout_request_id, status)
        VALUES($1,$2,$3,$4,$5,'pending')`,
        [req.schoolId, studentId, phone, amount, result.CheckoutRequestID]).catch(()=>{});
      res.json({ success: true, message: 'STK Push sent. Ask parent to enter M-Pesa PIN.', checkoutRequestId: result.CheckoutRequestID });
    } else {
      res.status(400).json({ error: result.ResponseDescription || 'STK Push failed' });
    }
  } catch (e) { res.status(500).json({ error: e.message }); }
};

// ── Fee Summary / Reports ─────────────────────────────────────
const getFeeSummary = async (req, res) => {
  try {
    const { rows: summary } = await query(`
      SELECT COALESCE(SUM(fp.amount) FILTER (WHERE fp.status='completed'),0) as total_collected,
             COUNT(DISTINCT fp.student_id) FILTER (WHERE fp.status='completed') as students_who_paid,
             COUNT(fp.id) FILTER (WHERE fp.status='completed') as transaction_count,
             COALESCE(AVG(fp.amount) FILTER (WHERE fp.status='completed'),0) as avg_payment,
             COALESCE(SUM(fp.amount) FILTER (WHERE fp.status='completed' AND fp.payment_method::text ILIKE '%mpesa%'),0) as mpesa_amount,
             COALESCE(SUM(fp.amount) FILTER (WHERE fp.status='completed' AND fp.payment_method::text='cash'),0) as cash_amount,
             COALESCE(SUM(fp.amount) FILTER (WHERE fp.status='completed' AND fp.payment_method::text='bank_transfer'),0) as bank_amount
      FROM fee_payments fp WHERE fp.school_id=$1`, [req.schoolId]);

    const { rows: topDefaulters } = await query(`
      SELECT s.first_name || ' ' || s.last_name as name, s.admission_number,
             c.name as class_name, s.id,
             COALESCE(sfa.net_fees,0) as total_fees,
             COALESCE(SUM(fp.amount) FILTER (WHERE fp.status='completed'),0) as paid,
             COALESCE(sfa.net_fees,0) - COALESCE(SUM(fp.amount) FILTER (WHERE fp.status='completed'),0) as balance
      FROM students s JOIN classes c ON c.id=s.current_class_id
      LEFT JOIN student_fee_assignments sfa ON sfa.student_id=s.id
      LEFT JOIN fee_payments fp ON fp.student_id=s.id
      WHERE s.school_id=$1 AND s.is_active=true
      GROUP BY s.id, c.name, sfa.net_fees
      HAVING COALESCE(sfa.net_fees,0) - COALESCE(SUM(fp.amount) FILTER (WHERE fp.status='completed'),0) > 0
      ORDER BY balance DESC LIMIT 15`, [req.schoolId]);

    res.json({ summary: summary[0], topDefaulters });
  } catch (e) { res.status(500).json({ error: e.message }); }
};

const getStudentStatement = async (req, res) => {
  try {
    const { id } = req.params;
    const { rows: student } = await query(`
      SELECT s.*, c.name as class_name FROM students s
      LEFT JOIN classes c ON c.id = s.current_class_id
      WHERE s.id=$1 AND s.school_id=$2`, [id, req.schoolId]);
    if (!student.length) return res.status(404).json({ error: 'Not found' });

    const { rows: fees } = await query(`
      SELECT fs.name as structure_name, sfa.gross_fees, sfa.net_fees, sfa.discount_amount
      FROM student_fee_assignments sfa JOIN fee_structures fs ON fs.id=sfa.fee_structure_id
      WHERE sfa.student_id=$1`, [id]);

    const { rows: payments } = await query(`
      SELECT fp.receipt_number, fp.amount, fp.payment_method, fp.payment_date, fp.mpesa_receipt
      FROM fee_payments fp WHERE fp.student_id=$1 AND fp.status='completed'
      ORDER BY fp.payment_date DESC`, [id]);

    const totalExpected = fees.reduce((s,f) => s+parseFloat(f.net_fees||0), 0);
    const totalPaid     = payments.reduce((s,p) => s+parseFloat(p.amount||0), 0);

    res.json({ student: student[0], fees, payments, totalExpected, totalPaid, balance: totalExpected - totalPaid });
  } catch (e) { res.status(500).json({ error: e.message }); }
};

const sendDefaulterSMS = async (req, res) => {
  try {
    const { message, classId } = req.body;
    const { rows: defaulters } = await query(`
      SELECT DISTINCT sp.phone, s.first_name, s.last_name
      FROM students s JOIN student_parents sp ON sp.student_id=s.id AND sp.is_primary=true
      LEFT JOIN student_fee_assignments sfa ON sfa.student_id=s.id
      LEFT JOIN fee_payments fp ON fp.student_id=s.id AND fp.status='completed'
      WHERE s.school_id=$1 AND s.is_active=true ${classId ? 'AND s.current_class_id=$2' : ''}
      GROUP BY s.id, sp.phone, s.first_name, s.last_name, sfa.net_fees
      HAVING COALESCE(sfa.net_fees,0) - COALESCE(SUM(fp.amount),0) > 500`,
      classId ? [req.schoolId, classId] : [req.schoolId]);
    const phones = defaulters.filter(d => d.phone).map(d => d.phone);
    if (!phones.length) return res.json({ sent: 0, message: 'No defaulters found with phone numbers' });
    const defaultMsg = message || `Dear Parent, your child has an outstanding school fee balance. Please clear it promptly to avoid disruption of studies. Thank you.`;
    await smsService.sendSms({ to: phones, message: defaultMsg });
    res.json({ sent: phones.length });
  } catch (e) { res.status(500).json({ error: e.message }); }
};

module.exports = {
  getFeeStructures, getFeeStructure, createFeeStructure, assignFeesToStudents,
  getPayments, recordPayment, initiateMpesaSTK,
  getFeeSummary, getStudentStatement, sendDefaulterSMS,
};
