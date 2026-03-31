// ============================================================
// Billing & Invoice Controller
// Automated billing cycles, invoice generation, reminders
// ============================================================
const { query, withTransaction, paginatedQuery } = require('../config/database');
const { cache } = require('../config/redis');
const documentService = require('../services/documentService');
const emailService = require('../services/emailService');
const smsService = require('../services/smsService');
const logger = require('../config/logger');

// ── GET /api/billing/invoices ─────────────────────────────────
const getInvoices = async (req, res) => {
  const { page = 1, limit = 30, status, studentId, classId, from, to } = req.query;

  let sql = `
    SELECT bi.*,
           s.first_name, s.last_name, s.admission_number,
           c.name as class_name,
           sp.first_name as parent_name, sp.phone as parent_phone, sp.email as parent_email,
           u.first_name||' '||u.last_name as generated_by_name
    FROM billing_invoices bi
    JOIN students s ON bi.student_id=s.id
    LEFT JOIN classes c ON s.current_class_id=c.id
    LEFT JOIN student_parents sp ON sp.student_id=s.id AND sp.is_primary=true
    LEFT JOIN users u ON bi.generated_by=u.id
    WHERE bi.school_id=$1
  `;
  const params = [req.schoolId]; let i = 2;
  if (status) { sql += ` AND bi.status=$${i++}`; params.push(status); }
  if (studentId) { sql += ` AND bi.student_id=$${i++}`; params.push(studentId); }
  if (classId) { sql += ` AND s.current_class_id=$${i++}`; params.push(classId); }
  if (from) { sql += ` AND bi.due_date >= $${i++}`; params.push(from); }
  if (to) { sql += ` AND bi.due_date <= $${i++}`; params.push(to); }
  sql += ' ORDER BY bi.created_at DESC';

  res.json(await paginatedQuery(sql, params, parseInt(page), parseInt(limit)));
};

// ── POST /api/billing/invoices/generate — bulk generate for class/term
const generateInvoices = async (req, res) => {
  const { classId, termId, academicYearId, dueDate, generateAll } = req.body;
  if (!termId || !academicYearId || !dueDate) {
    return res.status(400).json({ error: 'termId, academicYearId, and dueDate required' });
  }

  // Get students
  let studentQuery = `
    SELECT s.id, s.first_name, s.last_name, s.admission_number,
           sfa.id as fee_assignment_id, sfa.net_fees as amount,
           sp.email as parent_email, sp.phone as parent_phone, sp.first_name as parent_name
    FROM students s
    JOIN student_fee_assignments sfa ON sfa.student_id=s.id
      AND sfa.academic_year_id=$1 AND sfa.term_id=$2
    LEFT JOIN student_parents sp ON sp.student_id=s.id AND sp.is_primary=true
    WHERE s.school_id=$3 AND s.is_active=true
  `;
  const params = [academicYearId, termId, req.schoolId];
  if (classId && !generateAll) { studentQuery += ' AND s.current_class_id=$4'; params.push(classId); }

  const { rows: students } = await query(studentQuery, params);
  if (!students.length) return res.status(404).json({ error: 'No students with fee assignments found' });

  const { rows: schoolRows } = await query(
    'SELECT name, school_code FROM schools WHERE id=$1', [req.schoolId]
  );
  const school = schoolRows[0];

  let generated = 0, skipped = 0;
  const invoiceNumbers = [];

  await withTransaction(async (client) => {
    for (const student of students) {
      // Skip if invoice already exists for this term
      const { rows: existing } = await client.query(
        'SELECT id FROM billing_invoices WHERE student_id=$1 AND term_id=$2 AND academic_year_id=$3',
        [student.id, termId, academicYearId]
      );
      if (existing.length) { skipped++; continue; }

      const invNumber = `INV-${school.school_code}-${Date.now().toString().slice(-6)}-${generated + 1}`;
      const { rows: invRows } = await client.query(
        `INSERT INTO billing_invoices(
           school_id, student_id, fee_assignment_id, term_id, academic_year_id,
           invoice_number, amount_due, due_date, status, generated_by
         ) VALUES($1,$2,$3,$4,$5,$6,$7,$8,'unpaid',$9) RETURNING *`,
        [req.schoolId, student.id, student.fee_assignment_id, termId, academicYearId,
         invNumber, student.amount, dueDate, req.user.id]
      );
      invoiceNumbers.push(invNumber);
      generated++;
    }
  });

  res.status(201).json({
    message: `${generated} invoices generated, ${skipped} skipped (already existed)`,
    generated, skipped, total: students.length,
  });
};

// ── GET /api/billing/invoices/:id/pdf ─────────────────────────
const downloadInvoicePdf = async (req, res) => {
  const { rows } = await query(
    `SELECT bi.*,
            s.first_name, s.last_name, s.admission_number, s.gender,
            c.name as class_name, c.level,
            sp.first_name as parent_name, sp.last_name as parent_last, sp.phone as parent_phone, sp.email as parent_email,
            sch.name as school_name, sch.logo_url, sch.address, sch.phone as school_phone, sch.email as school_email, sch.motto,
            ay.year, tc.term,
            fs.name as fee_structure_name
     FROM billing_invoices bi
     JOIN students s ON bi.student_id=s.id
     LEFT JOIN classes c ON s.current_class_id=c.id
     LEFT JOIN student_parents sp ON sp.student_id=s.id AND sp.is_primary=true
     JOIN schools sch ON bi.school_id=sch.id
     LEFT JOIN academic_years ay ON bi.academic_year_id=ay.id
     LEFT JOIN terms_config tc ON bi.term_id=tc.id
     LEFT JOIN student_fee_assignments sfa ON bi.fee_assignment_id=sfa.id
     LEFT JOIN fee_structures fs ON sfa.fee_structure_id=fs.id
     WHERE bi.id=$1 AND bi.school_id=$2`,
    [req.params.id, req.schoolId]
  );
  if (!rows.length) return res.status(404).json({ error: 'Invoice not found' });
  const inv = rows[0];

  // Get fee items
  const { rows: items } = await query(
    `SELECT fi.name, fi.category, fi.amount, fi.is_mandatory
     FROM student_fee_assignments sfa
     JOIN fee_structures fs ON sfa.fee_structure_id=fs.id
     JOIN fee_items fi ON fi.fee_structure_id=fs.id
     WHERE sfa.id=$1 ORDER BY fi.sort_order`,
    [inv.fee_assignment_id]
  );

  // Get payments made
  const { rows: payments } = await query(
    `SELECT fp.amount, fp.payment_method, fp.receipt_number, fp.mpesa_receipt, fp.payment_date
     FROM fee_payments fp WHERE fp.student_id=$1 AND fp.school_id=$2 AND fp.status='completed'
     ORDER BY fp.payment_date DESC`,
    [inv.student_id, req.schoolId]
  );
  const totalPaid = payments.reduce((s, p) => s + parseFloat(p.amount), 0);
  const balance = parseFloat(inv.amount_due) - totalPaid;

  const html = buildInvoiceHtml(inv, items, payments, totalPaid, balance);
  const pdf = await documentService.htmlToPdf(html);

  // Mark as sent
  await query(
    "UPDATE billing_invoices SET status=CASE WHEN status='unpaid' THEN 'sent' ELSE status END, sent_at=COALESCE(sent_at,NOW()) WHERE id=$1",
    [req.params.id]
  );

  res.set('Content-Type', 'application/pdf');
  res.set('Content-Disposition', `attachment; filename="invoice-${inv.invoice_number}.pdf"`);
  res.send(pdf);
};

const buildInvoiceHtml = (inv, items, payments, totalPaid, balance) => `
<!DOCTYPE html><html><head><meta charset="UTF-8">
<style>
  * { box-sizing:border-box; margin:0; padding:0; }
  body { font-family:Arial,sans-serif; font-size:11px; color:#1a202c; padding:24px; }
  .header { display:flex; justify-content:space-between; align-items:flex-start; border-bottom:3px solid #1a365d; padding-bottom:16px; margin-bottom:16px; }
  .school-name { font-size:18px; font-weight:800; color:#1a365d; text-transform:uppercase; }
  .inv-badge { background:#1a365d; color:#fff; padding:8px 16px; border-radius:6px; text-align:right; }
  .inv-number { font-size:14px; font-weight:700; }
  .info-grid { display:grid; grid-template-columns:1fr 1fr; gap:16px; margin-bottom:16px; }
  .info-box { background:#f7fafc; padding:12px; border-radius:6px; border-left:3px solid #3b82f6; }
  .info-label { font-size:9px; color:#718096; text-transform:uppercase; margin-bottom:4px; }
  .info-value { font-weight:600; color:#2d3748; }
  table { width:100%; border-collapse:collapse; margin-bottom:16px; }
  th { background:#1a365d; color:#fff; padding:7px; text-align:left; font-size:10px; }
  td { padding:6px 7px; border-bottom:1px solid #e2e8f0; }
  tr:nth-child(even) td { background:#f7fafc; }
  .total-box { display:flex; justify-content:flex-end; }
  .total-table { width:260px; }
  .total-row { display:flex; justify-content:space-between; padding:6px 0; border-bottom:1px solid #e2e8f0; }
  .final-row { display:flex; justify-content:space-between; background:#1a365d; color:#fff; padding:10px; border-radius:4px; font-size:14px; font-weight:800; margin-top:8px; }
  .status-badge { display:inline-block; padding:4px 12px; border-radius:999px; font-weight:700; font-size:11px; }
  .paid { background:#c6f6d5; color:#276749; }
  .partial { background:#fefcbf; color:#744210; }
  .unpaid { background:#fed7d7; color:#9b2c2c; }
</style></head><body>
<div class="header">
  <div>
    ${inv.logo_url ? `<img src="${inv.logo_url}" style="height:60px;object-fit:contain;margin-bottom:8px">` : ''}
    <div class="school-name">${inv.school_name}</div>
    <div style="color:#4a5568;font-size:10px">${inv.address||''} | ${inv.school_phone||''}</div>
    <div style="color:#4a5568;font-size:10px">${inv.school_email||''}</div>
  </div>
  <div class="inv-badge">
    <div style="font-size:10px;opacity:0.8">INVOICE</div>
    <div class="inv-number">${inv.invoice_number}</div>
    <div style="font-size:9px;margin-top:4px">Due: ${new Date(inv.due_date).toLocaleDateString('en-KE',{dateStyle:'medium'})}</div>
    <div style="margin-top:6px">
      <span class="status-badge ${balance <= 0 ? 'paid' : totalPaid > 0 ? 'partial' : 'unpaid'}">
        ${balance <= 0 ? '✓ PAID' : totalPaid > 0 ? 'PARTIAL' : 'UNPAID'}
      </span>
    </div>
  </div>
</div>
<div class="info-grid">
  <div class="info-box">
    <div class="info-label">Bill To</div>
    <div class="info-value">${inv.parent_name} ${inv.parent_last||''}</div>
    <div style="color:#4a5568">${inv.parent_phone||''}</div>
    <div style="color:#4a5568">${inv.parent_email||''}</div>
  </div>
  <div class="info-box">
    <div class="info-label">Student Details</div>
    <div class="info-value">${inv.first_name} ${inv.last_name}</div>
    <div style="color:#4a5568">Adm No: ${inv.admission_number}</div>
    <div style="color:#4a5568">Class: ${inv.class_name||''} | ${inv.term?.replace('_',' ')||''} ${inv.year||''}</div>
  </div>
</div>
<table>
  <thead><tr><th>#</th><th>Description</th><th>Category</th><th>Mandatory</th><th style="text-align:right">Amount (KES)</th></tr></thead>
  <tbody>
    ${items.map((item, i) => `
      <tr>
        <td style="color:#718096">${i+1}</td>
        <td><strong>${item.name}</strong></td>
        <td><span style="background:#ebf8ff;color:#2b6cb0;padding:2px 6px;border-radius:4px;font-size:9px">${item.category}</span></td>
        <td>${item.is_mandatory ? '✓' : '—'}</td>
        <td style="text-align:right;font-weight:600">${parseFloat(item.amount).toLocaleString()}</td>
      </tr>`).join('')}
  </tbody>
</table>
${payments.length ? `
<div style="font-weight:700;margin-bottom:8px">Payment History</div>
<table>
  <thead><tr><th>Date</th><th>Receipt No</th><th>Method</th><th>M-Pesa Ref</th><th style="text-align:right">Amount (KES)</th></tr></thead>
  <tbody>
    ${payments.map(p => `
      <tr>
        <td>${new Date(p.payment_date).toLocaleDateString('en-KE')}</td>
        <td><strong>${p.receipt_number}</strong></td>
        <td>${p.payment_method?.replace(/_/g,' ').toUpperCase()}</td>
        <td>${p.mpesa_receipt||'—'}</td>
        <td style="text-align:right;color:#38a169;font-weight:600">${parseFloat(p.amount).toLocaleString()}</td>
      </tr>`).join('')}
  </tbody>
</table>` : ''}
<div class="total-box">
  <div class="total-table">
    <div class="total-row"><span>Total Fees:</span><span style="font-weight:600">KES ${parseFloat(inv.amount_due).toLocaleString()}</span></div>
    <div class="total-row"><span>Total Paid:</span><span style="font-weight:600;color:#38a169">KES ${totalPaid.toLocaleString()}</span></div>
    <div class="final-row"><span>${balance <= 0 ? '✓ Fully Paid' : 'Balance Due'}:</span><span>KES ${Math.abs(balance).toLocaleString()}</span></div>
  </div>
</div>
<p style="margin-top:20px;font-size:10px;color:#718096;text-align:center">
  Pay via M-Pesa or bank transfer. Reference: ${inv.admission_number}.
  For queries contact: ${inv.school_phone||''} | ${inv.school_email||''}
</p>
</body></html>`;

// ── POST /api/billing/send-reminders ─────────────────────────
const sendInvoiceReminders = async (req, res) => {
  const { daysOverdue = 0, classId } = req.body;

  let sql = `
    SELECT bi.id, bi.invoice_number, bi.amount_due, bi.due_date,
           s.first_name, s.last_name, s.admission_number,
           sp.phone as parent_phone, sp.email as parent_email, sp.first_name as parent_name,
           sch.name as school_name
    FROM billing_invoices bi
    JOIN students s ON bi.student_id=s.id
    LEFT JOIN student_parents sp ON sp.student_id=s.id AND sp.is_primary=true
    JOIN schools sch ON bi.school_id=sch.id
    WHERE bi.school_id=$1 AND bi.status IN ('unpaid','partial')
      AND bi.due_date <= CURRENT_DATE - INTERVAL '${parseInt(daysOverdue)} days'
  `;
  const params = [req.schoolId];
  if (classId) { sql += ' AND s.current_class_id=$2'; params.push(classId); }

  const { rows: overdue } = await query(sql, params);
  let sent = 0;

  for (const inv of overdue) {
    const msg = `Dear ${inv.parent_name||'Parent'}, your child ${inv.first_name} ${inv.last_name} (${inv.admission_number}) has an unpaid invoice of KES ${parseFloat(inv.amount_due).toLocaleString()} at ${inv.school_name}. Invoice: ${inv.invoice_number}. Please pay immediately to avoid disruption.`;

    if (inv.parent_phone) {
      await smsService.send(inv.parent_phone, msg).catch(() => {});
      sent++;
    }

    await query(
      'UPDATE billing_invoices SET reminder_count=reminder_count+1, last_reminder_at=NOW() WHERE id=$1',
      [inv.id]
    );
  }

  res.json({ message: `Reminders sent to ${sent} parents`, total: overdue.length, sent });
};

// ── GET /api/billing/summary ──────────────────────────────────
const getBillingSummary = async (req, res) => {
  const { rows } = await query(
    `SELECT
       COUNT(*) as total_invoices,
       COUNT(*) FILTER (WHERE status='paid') as paid_count,
       COUNT(*) FILTER (WHERE status='unpaid') as unpaid_count,
       COUNT(*) FILTER (WHERE status='partial') as partial_count,
       COALESCE(SUM(amount_due),0) as total_billed,
       COALESCE(SUM(amount_paid),0) as total_paid,
       COALESCE(SUM(amount_due) FILTER (WHERE status='unpaid'),0) as total_outstanding
     FROM billing_invoices WHERE school_id=$1`,
    [req.schoolId]
  );
  const { rows: byClass } = await query(
    `SELECT c.name as class_name,
            COUNT(bi.id) as invoices,
            COALESCE(SUM(bi.amount_due),0) as billed,
            COALESCE(SUM(bi.amount_paid),0) as paid
     FROM billing_invoices bi
     JOIN students s ON bi.student_id=s.id
     LEFT JOIN classes c ON s.current_class_id=c.id
     WHERE bi.school_id=$1
     GROUP BY c.id ORDER BY c.level, c.stream`,
    [req.schoolId]
  );
  res.json({ summary: rows[0], byClass });
};

module.exports = {
  getInvoices, generateInvoices, downloadInvoicePdf,
  sendInvoiceReminders, getBillingSummary,
};
