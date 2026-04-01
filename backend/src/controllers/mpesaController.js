// ============================================================
// M-Pesa Full Automation Controller
// STK Push → Callback → Auto Receipt → Student Account Sync
// Real-time socket updates, parent notification
// ============================================================
const { query, withTransaction } = require('../config/database');
const mpesaService = require('../services/mpesaService');
const documentService = require('../services/documentService');
const smsService = require('../services/smsService');
const emailService = require('../services/emailService');
const logger = require('../config/logger');

// ── Format phone to 254 format ────────────────────────────────
const formatPhone = (phone) => {
  if (!phone) return null;
  const clean = phone.replace(/\D/g, '');
  if (clean.startsWith('0')) return '254' + clean.slice(1);
  if (clean.startsWith('254')) return clean;
  if (clean.startsWith('7') || clean.startsWith('1')) return '254' + clean;
  return clean;
};

// ── POST /api/mpesa/stk-push ──────────────────────────────────
const initiateStkPush = async (req, res) => {
  const {
    studentId, phone, amount, feeStructureId,
    academicYearId, termId, notes,
  } = req.body;

  if (!studentId || !phone || !amount) {
    return res.status(400).json({ error: 'studentId, phone, amount required' });
  }

  // Get student info for reference
  const { rows: studentRows } = await query(
    `SELECT s.*, sch.name as school_name, sch.school_code
     FROM students s JOIN schools sch ON s.school_id=sch.id
     WHERE s.id=$1 AND s.school_id=$2`,
    [studentId, req.schoolId]
  );
  if (!studentRows.length) return res.status(404).json({ error: 'Student not found' });
  const student = studentRows[0];

  const formattedPhone = formatPhone(phone);
  const accountRef = `${student.admission_number}`.substring(0, 12);
  const description = `Fees ${student.last_name}`.substring(0, 13);

  try {
    const stkResponse = await mpesaService.stkPush({
      phone: formattedPhone,
      amount: Math.ceil(parseFloat(amount)),
      accountReference: accountRef,
      transactionDesc: description,
      callbackUrl: `${process.env.API_BASE_URL}/api/mpesa/callback`,
    });

    // Store pending STK request
    const { rows } = await query(
      `INSERT INTO mpesa_stk_requests(
         school_id, student_id, phone, amount,
         account_reference, checkout_request_id, merchant_request_id,
         initiated_by
       ) VALUES($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
      [
        req.schoolId, studentId, formattedPhone, amount,
        accountRef, stkResponse.CheckoutRequestID, stkResponse.MerchantRequestID,
        req.user.id,
      ]
    );

    // Notify via socket that payment is awaiting confirmation
    const io = req.app.get('io');
    if (io) {
      io.to(`school-${req.schoolId}`).emit('mpesa:pending', {
        studentId, amount, phone: formattedPhone,
        checkoutRequestId: stkResponse.CheckoutRequestID,
      });
    }

    res.json({
      message: 'STK Push sent. Please check your phone and enter M-Pesa PIN.',
      checkoutRequestId: stkResponse.CheckoutRequestID,
      studentName: `${student.first_name} ${student.last_name}`,
      amount,
    });
  } catch (err) {
    logger.error('STK Push error:', err.message);
    res.status(500).json({ error: 'M-Pesa STK push failed. ' + err.message });
  }
};

// ── POST /api/mpesa/callback — Safaricom callback ─────────────
const stkCallback = async (req, res) => {
  // Always respond 200 to Safaricom first
  res.json({ ResultCode: 0, ResultDesc: 'Accepted' });

  try {
    const body = req.body?.Body?.stkCallback;
    if (!body) return;

    const checkoutRequestId = body.CheckoutRequestID;
    const resultCode = body.ResultCode;

    // Find pending request
    const { rows: stkRows } = await query(
      'SELECT * FROM mpesa_stk_requests WHERE checkout_request_id=$1 AND status=$2',
      [checkoutRequestId, 'pending']
    );
    if (!stkRows.length) return;
    const stk = stkRows[0];

    if (resultCode !== 0) {
      // Payment failed or cancelled
      await query(
        'UPDATE mpesa_stk_requests SET status=$1, result_code=$2, result_desc=$3 WHERE id=$4',
        ['failed', String(resultCode), body.ResultDesc, stk.id]
      );
      return;
    }

    // Extract metadata from successful payment
    const meta = {};
    (body.CallbackMetadata?.Item || []).forEach(item => {
      meta[item.Name] = item.Value;
    });

    const mpesaReceipt = meta.MpesaReceiptNumber;
    const amount = parseFloat(meta.Amount);
    const phone = String(meta.PhoneNumber || stk.phone);
    const transactionDate = meta.TransactionDate;

    // Create fee payment record atomically
    const feePaymentId = await withTransaction(async (client) => {
      // Create fee payment
      const { rows: payRows } = await client.query(
        `INSERT INTO fee_payments(
           school_id, student_id, amount, payment_method,
           status, mpesa_receipt, mpesa_phone, mpesa_transaction_id,
           payment_date, notes, created_by
         ) VALUES($1,$2,$3,'mpesa_stk','completed',$4,$5,$6,CURRENT_DATE,$7,$8)
         RETURNING *`,
        [
          stk.school_id, stk.student_id, amount, mpesaReceipt,
          phone, mpesaReceipt,
          `Auto payment via STK Push`, stk.initiated_by,
        ]
      );
      const payment = payRows[0];

      // Update STK request
      await client.query(
        `UPDATE mpesa_stk_requests SET status='completed', mpesa_receipt=$1,
         result_code='0', fee_payment_id=$2, completed_at=NOW()
         WHERE id=$3`,
        [mpesaReceipt, payment.id, stk.id]
      );

      // Add timeline event
      await client.query(
        `INSERT INTO student_timeline(school_id, student_id, event_type, title, description, event_date, category, colour, metadata)
         VALUES($1,$2,'fee_payment','Fee Payment Received',
         'KES ' || $3 || ' received via M-Pesa. Receipt: ' || $4,
         CURRENT_DATE, 'finance', '#38a169', $5::jsonb)`,
        [stk.school_id, stk.student_id, amount, mpesaReceipt,
         JSON.stringify({ amount, mpesaReceipt, phone })]
      );

      // Award points for fee payment
      await client.query(
        `INSERT INTO student_points(school_id, student_id, points, reason, category, academic_year)
         VALUES($1,$2,5,'Fee payment completed','behavior',$3)`,
        [stk.school_id, stk.student_id, new Date().getFullYear()]
      );

      return payment.id;
    });

    // Fetch student & school for receipt
    const { rows: studentRows } = await query(
      `SELECT s.*, c.name as class_name, sch.name as school_name,
              sch.logo_url, sch.address, sch.phone as school_phone,
              sch.email as school_email, sch.motto,
              sp.phone as parent_phone, sp.email as parent_email, sp.first_name as parent_name
       FROM students s
       LEFT JOIN classes c ON s.current_class_id=c.id
       JOIN schools sch ON s.school_id=sch.id
       LEFT JOIN student_parents sp ON sp.student_id=s.id AND sp.is_primary=true
       WHERE s.id=$1`,
      [stk.student_id]
    );
    const student = studentRows[0];

    // Send SMS confirmation to parent
    if (student.parent_phone) {
      const sms =
        `✅ Payment confirmed!\n` +
        `${student.first_name} ${student.last_name}\n` +
        `KES ${amount.toLocaleString()} received\n` +
        `Receipt: ${mpesaReceipt}\n` +
        `${student.school_name}\n` +
        `Thank you!`;
      smsService.send(formatPhone(student.parent_phone), sms).catch(() => {});
    }

    // Emit real-time update via Socket.IO
    const io = require('../server').io;
    if (io) {
      io.to(`school-${stk.school_id}`).emit('mpesa:confirmed', {
        studentId: stk.student_id,
        amount, mpesaReceipt,
        feePaymentId,
        studentName: `${student.first_name} ${student.last_name}`,
      });
      io.to(`student-${stk.student_id}`).emit('fees:updated', { amount, receipt: mpesaReceipt });
    }

    logger.info(`M-Pesa payment confirmed: ${mpesaReceipt} - KES ${amount} for ${student.first_name} ${student.last_name}`);
  } catch (err) {
    logger.error('M-Pesa callback processing error:', err);
  }
};

// ── GET /api/mpesa/status/:checkoutRequestId ──────────────────
const checkStkStatus = async (req, res) => {
  const { checkoutRequestId } = req.params;

  const { rows } = await query(
    `SELECT msr.*, fp.receipt_number, fp.amount as confirmed_amount
     FROM mpesa_stk_requests msr
     LEFT JOIN fee_payments fp ON msr.fee_payment_id=fp.id
     WHERE msr.checkout_request_id=$1 AND msr.school_id=$2`,
    [checkoutRequestId, req.schoolId]
  );
  if (!rows.length) return res.status(404).json({ error: 'STK request not found' });

  const stk = rows[0];

  // If still pending after 30s, query Safaricom
  if (stk.status === 'pending') {
    const ageSeconds = (Date.now() - new Date(stk.created_at).getTime()) / 1000;
    if (ageSeconds > 30) {
      try {
        const result = await mpesaService.queryStkStatus(checkoutRequestId);
        if (result.ResultCode === '0') {
          await query(
            'UPDATE mpesa_stk_requests SET status=$1 WHERE checkout_request_id=$2',
            ['completed', checkoutRequestId]
          );
          stk.status = 'completed';
        } else if (result.ResultCode !== '1032') {
          await query(
            'UPDATE mpesa_stk_requests SET status=$1, result_desc=$2 WHERE checkout_request_id=$3',
            ['failed', result.ResultDesc, checkoutRequestId]
          );
          stk.status = 'failed';
        }
      } catch (e) { /* Query failed, return current status */ }
    }
  }

  res.json(stk);
};

// ── GET /api/mpesa/receipt/:paymentId ─────────────────────────
const downloadReceipt = async (req, res) => {
  const { rows } = await query(
    `SELECT fp.*, s.first_name, s.last_name, s.admission_number,
            c.name as class_name,
            sch.name as school_name, sch.logo_url, sch.address, sch.phone as school_phone,
            sch.motto, sch.email as school_email
     FROM fee_payments fp
     JOIN students s ON fp.student_id=s.id
     LEFT JOIN classes c ON s.current_class_id=c.id
     JOIN schools sch ON fp.school_id=sch.id
     WHERE fp.id=$1 AND fp.school_id=$2`,
    [req.params.paymentId, req.schoolId]
  );
  if (!rows.length) return res.status(404).json({ error: 'Payment not found' });
  const p = rows[0];

  const receiptHtml = `<!DOCTYPE html><html><head><meta charset="UTF-8">
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: Arial, sans-serif; color: #1a202c; font-size: 11px; }
    .receipt { width: 80mm; margin: 0 auto; padding: 8mm; border: 1px solid #e2e8f0; }
    .header { text-align: center; border-bottom: 2px solid #1a365d; padding-bottom: 8px; margin-bottom: 8px; }
    .school-name { font-size: 13px; font-weight: 800; color: #1a365d; text-transform: uppercase; }
    .title { font-size: 11px; font-weight: 700; color: #2b6cb0; margin: 4px 0; }
    .row { display: flex; justify-content: space-between; padding: 4px 0; border-bottom: 1px dashed #e2e8f0; }
    .label { color: #718096; }
    .value { font-weight: 600; }
    .amount { font-size: 18px; font-weight: 800; color: #38a169; text-align: center; margin: 10px 0; }
    .footer { text-align: center; font-size: 9px; color: #718096; margin-top: 10px; border-top: 1px solid #e2e8f0; padding-top: 6px; }
    .status { background: #f0fff4; border: 1px solid #68d391; border-radius: 4px; text-align: center; padding: 4px; color: #276749; font-weight: 700; margin: 8px 0; }
  </style></head><body>
  <div class="receipt">
    <div class="header">
      ${p.logo_url ? `<img src="${p.logo_url}" style="width:50px;height:50px;object-fit:contain;margin-bottom:4px">` : ''}
      <div class="school-name">${p.school_name}</div>
      <div class="title">OFFICIAL PAYMENT RECEIPT</div>
    </div>
    <div class="status">✓ PAYMENT CONFIRMED</div>
    <div class="amount">KES ${parseFloat(p.amount).toLocaleString()}</div>
    <div class="row"><span class="label">Receipt No:</span><span class="value">${p.receipt_number}</span></div>
    <div class="row"><span class="label">Student:</span><span class="value">${p.first_name} ${p.last_name}</span></div>
    <div class="row"><span class="label">Adm No:</span><span class="value">${p.admission_number}</span></div>
    <div class="row"><span class="label">Class:</span><span class="value">${p.class_name}</span></div>
    <div class="row"><span class="label">Method:</span><span class="value">${p.payment_method?.replace(/_/g,' ').toUpperCase()}</span></div>
    ${p.mpesa_receipt ? `<div class="row"><span class="label">M-Pesa Ref:</span><span class="value">${p.mpesa_receipt}</span></div>` : ''}
    <div class="row"><span class="label">Date:</span><span class="value">${new Date(p.payment_date || p.created_at).toLocaleDateString('en-KE', {dateStyle:'medium'})}</span></div>
    <div class="footer">
      ${p.school_name} | ${p.school_phone || ''}<br>
      ${p.address || ''}<br>
      This is an official receipt. Keep for records.<br>
      Generated: ${new Date().toLocaleString('en-KE')}
    </div>
  </div></body></html>`;

  const pdf = await documentService.htmlToPdf(receiptHtml, {
    format: 'A6',
    margin: { top: '3mm', right: '3mm', bottom: '3mm', left: '3mm' },
  });

  res.set('Content-Type', 'application/pdf');
  res.set('Content-Disposition', `attachment; filename="receipt-${p.receipt_number}.pdf"`);
  res.send(pdf);
};

// ── GET /api/mpesa/history ────────────────────────────────────
const getPaymentHistory = async (req, res) => {
  const { studentId, from, to, status } = req.query;
  let sql = `
    SELECT msr.*, s.first_name, s.last_name, s.admission_number, c.name as class_name
    FROM mpesa_stk_requests msr
    JOIN students s ON msr.student_id=s.id
    LEFT JOIN classes c ON s.current_class_id=c.id
    WHERE msr.school_id=$1
  `;
  const params = [req.schoolId]; let i = 2;
  if (studentId) { sql += ` AND msr.student_id=$${i++}`; params.push(studentId); }
  if (status) { sql += ` AND msr.status=$${i++}`; params.push(status); }
  if (from) { sql += ` AND msr.created_at >= $${i++}`; params.push(from); }
  if (to) { sql += ` AND msr.created_at <= $${i++}`; params.push(to); }
  sql += ' ORDER BY msr.created_at DESC LIMIT 100';
  const { rows } = await query(sql, params);
  res.json(rows);
};

module.exports = { initiateStkPush, stkCallback, checkStkStatus, downloadReceipt, getPaymentHistory };
