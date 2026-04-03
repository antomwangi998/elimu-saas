// ============================================================
// Dean of Studies Controller — COMPLETE REWRITE
// Full TSC verification pipeline integrated into registration
// ============================================================
const bcrypt     = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const { query, withTransaction, paginatedQuery } = require('../config/database');
const { cache }  = require('../config/redis');
const emailService = require('../services/emailService');
const smsService   = require('../services/smsService');
const logger       = require('../config/logger');
const tscEngine    = require('../services/tscVerificationEngine');

// ── Helper: send verification notification ───────────────────
const sendVerifNotification = async (staffId, schoolId, type, message, contact) => {
  await query(
    `INSERT INTO verification_notifications(staff_id, school_id, type, message)
     VALUES($1,$2,$3,$4)`,
    [staffId, schoolId, type, message]
  ).catch(() => {});
  if (contact?.phone) smsService.send(contact.phone, message).catch(() => {});
  if (contact?.email && contact?.name) {
    emailService.sendHtml(contact.email, `ElimuSaaS — ${type.replace(/_/g,' ')}`,
      `<div style="font-family:sans-serif;max-width:600px;margin:auto;padding:24px">
        <h3 style="color:#1a365d">${type.replace(/_/g,' ')}</h3>
        <p>${message}</p>
       </div>`
    ).catch(() => {});
  }
};

// ============================================================
// STEP 1: PRE-VALIDATE TSC (before full registration form)
// POST /api/dean/validate-tsc
// ============================================================
const preValidateTsc = async (req, res) => {
  const { tscNumber, firstName, lastName, nationalId } = req.body;
  if (!tscNumber) return res.status(400).json({ error: 'tscNumber is required' });

  const formatResult = tscEngine.validateTscFormat(tscNumber);
  if (!formatResult.valid) {
    return res.status(400).json({ valid: false, stage: 'format', errors: formatResult.errors, score: 0 });
  }

  const dupResult = await tscEngine.checkDuplicates(tscNumber, null, req.schoolId);
  const fraudResult = (firstName && lastName && nationalId)
    ? await tscEngine.detectFraudPatterns(tscNumber, firstName, lastName, nationalId, req.schoolId, null)
    : { flags: [], riskLevel: 'low' };

  const score = formatResult.score + dupResult.schoolDupScore + dupResult.globalDupScore;
  const allFlags = [...dupResult.flags, ...fraudResult.flags];
  const criticalFlags = allFlags.filter(f => f.severity === 'critical');

  return res.json({
    valid: !dupResult.hasDuplicates && criticalFlags.length === 0,
    tscNumber: formatResult.clean,
    score,
    formatCheck:    { passed: true },
    duplicateCheck: { passed: !dupResult.hasDuplicates, details: dupResult },
    fraudCheck:     { riskLevel: fraudResult.riskLevel, flags: fraudResult.flags },
    flags: allFlags,
    blockingIssues: [
      ...(dupResult.hasDuplicates ? [`TSC ${tscNumber} is already registered`] : []),
      ...criticalFlags.map(f => f.description),
    ],
    canProceed: !dupResult.hasDuplicates && criticalFlags.length === 0,
  });
};

// ============================================================
// STEP 2: REGISTER TEACHER
// POST /api/dean/register-teacher
// ============================================================
const registerTeacher = async (req, res) => {
  const allowed = ['dean_of_studies', 'principal', 'school_admin', 'super_admin'];
  if (!allowed.includes(req.user.role)) {
    return res.status(403).json({ error: 'Only the Dean of Studies can register teachers' });
  }

  const {
    firstName, lastName, otherNames, gender, dateOfBirth, email, phone, nationalId,
    tscNumber, staffNumber, designation, department, employmentType, employmentDate,
    qualification, specialization, role = 'teacher', isHod, hodDepartment,
    salaryGrade, bankName, bankAccount,
    nextOfKinName, nextOfKinPhone, nextOfKinRelationship,
  } = req.body;

  if (!firstName || !lastName || !tscNumber || !staffNumber || !nationalId) {
    return res.status(400).json({ error: 'firstName, lastName, tscNumber, staffNumber and nationalId are required' });
  }

  // Layer 1: Format
  const formatResult = tscEngine.validateTscFormat(tscNumber);
  if (!formatResult.valid) {
    return res.status(400).json({ error: 'Invalid TSC number format', details: formatResult.errors, layer: 'format_validation' });
  }
  const cleanTsc = formatResult.clean;

  // Layer 2: Duplicate
  const dupResult = await tscEngine.checkDuplicates(cleanTsc, null, req.schoolId);
  if (dupResult.hasDuplicates) {
    await query(
      `INSERT INTO tsc_fraud_flags(school_id, flag_type, description, severity, metadata)
       VALUES($1,'duplicate_tsc_attempt',$2,'critical',$3::jsonb)`,
      [req.schoolId, `Attempted to register duplicate TSC ${cleanTsc}`, JSON.stringify({ tscNumber: cleanTsc, attemptedBy: req.user.id })]
    ).catch(() => {});
    return res.status(409).json({
      error: 'TSC number already registered in the system', layer: 'duplicate_detection',
      details: { schoolDuplicates: dupResult.schoolDuplicates, globalDuplicates: dupResult.globalDuplicates },
    });
  }

  // Layer 6: Fraud pre-check
  const fraudPreCheck = await tscEngine.detectFraudPatterns(cleanTsc, firstName, lastName, nationalId, req.schoolId, null);
  if (fraudPreCheck.isFraud) {
    return res.status(409).json({
      error: 'Critical fraud pattern detected. Registration blocked.',
      layer: 'fraud_detection', flags: fraudPreCheck.flags, riskLevel: fraudPreCheck.riskLevel,
    });
  }

  const tempPwd = `TSC${cleanTsc.slice(-4)}${(phone || '0000').slice(-4)}`.toUpperCase();
  const passwordHash = await bcrypt.hash(tempPwd, 12);

  const result = await withTransaction(async (client) => {
    const { rows: userRows } = await client.query(
      `INSERT INTO users(school_id, role, email, phone, password_hash, first_name, last_name,
         other_names, gender, national_id, tsc_number, must_change_password, is_active,
         tsc_verification_status, is_tsc_verified)
       VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,true,true,'pending',false)
       ON CONFLICT(email) DO UPDATE SET school_id=$1, role=$2, tsc_number=$11,
         tsc_verification_status='pending', is_tsc_verified=false
       RETURNING *`,
      [req.schoolId, role, email, phone, passwordHash, firstName, lastName,
       otherNames, gender, nationalId, cleanTsc]
    );
    const user = userRows[0];

    const { rows: staffRows } = await client.query(
      `INSERT INTO staff(school_id, user_id, staff_number, tsc_number, designation, department,
         employment_type, employment_date, qualification, specialization, is_hod, hod_department,
         salary_grade, bank_name, bank_account, next_of_kin_name, next_of_kin_phone,
         next_of_kin_relationship, tsc_verification_status, tsc_verification_score)
       VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,'pending',0)
       ON CONFLICT(school_id, staff_number) DO UPDATE SET tsc_number=$4, tsc_verification_status='pending'
       RETURNING *`,
      [req.schoolId, user.id, staffNumber.toUpperCase(), cleanTsc,
       designation || 'Teacher', department, employmentType || 'permanent',
       employmentDate, qualification, specialization || [],
       isHod || false, hodDepartment, salaryGrade, bankName, bankAccount,
       nextOfKinName, nextOfKinPhone, nextOfKinRelationship]
    );
    const staff = staffRows[0];
    await client.query('UPDATE users SET staff_id=$1 WHERE id=$2', [staff.id, user.id]);

    const initialScore = tscEngine.SCORE_WEIGHTS.FORMAT_VALID + dupResult.schoolDupScore + dupResult.globalDupScore;
    const { rows: verifRows } = await client.query(
      `INSERT INTO tsc_verifications(school_id, staff_id, user_id, submitted_tsc, submitted_first_name,
         submitted_last_name, submitted_national_id, submitted_date_of_birth, submitted_by,
         status, score_format_valid, score_no_duplicate, score_no_global_dup)
       VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,'pending',$10,$11,$12) RETURNING *`,
      [req.schoolId, staff.id, user.id, cleanTsc, firstName, lastName,
       nationalId, dateOfBirth || null, req.user.id,
       tscEngine.SCORE_WEIGHTS.FORMAT_VALID, dupResult.schoolDupScore, dupResult.globalDupScore]
    );

    await client.query('UPDATE staff SET tsc_verification_score=$1 WHERE id=$2', [initialScore, staff.id]);

    for (const flag of fraudPreCheck.flags) {
      await client.query(
        `INSERT INTO tsc_fraud_flags(school_id, staff_id, user_id, flag_type, description, severity, metadata)
         VALUES($1,$2,$3,$4,$5,$6,$7::jsonb)`,
        [req.schoolId, staff.id, user.id, flag.type, flag.description, flag.severity, JSON.stringify(flag.data || {})]
      ).catch(() => {});
    }

    await client.query(
      `INSERT INTO audit_logs(school_id, user_id, action, entity_type, entity_id, new_data)
       VALUES($1,$2,'TEACHER_REGISTERED_PENDING','users',$3,$4::jsonb)`,
      [req.schoolId, req.user.id, user.id, JSON.stringify({ tscNumber: cleanTsc, staffNumber, role, initialScore })]
    );

    return { user, staff, verif: verifRows[0], tempPwd, initialScore };
  });

  const { rows: schoolRows } = await query('SELECT name, school_code FROM schools WHERE id=$1', [req.schoolId]);
  const school = schoolRows[0];

  const pendingMsg = `Welcome to ${school?.name}!\nYour account is PENDING TSC verification.\nTSC No: ${cleanTsc} | Temp Pwd: ${result.tempPwd}\nUpload your TSC Certificate & National ID to get full access.\n${process.env.FRONTEND_URL}`;
  if (phone) smsService.send(phone, pendingMsg).catch(() => {});
  if (email) {
    emailService.sendHtml(email, `${school?.name} — Account Pending Verification`, `
      <div style="font-family:sans-serif;max-width:600px;margin:auto;padding:24px">
        <h2 style="color:#1a365d">Welcome to ${school?.name}</h2>
        <div style="background:#fff3cd;border:1px solid #ffc107;border-radius:8px;padding:16px;margin:16px 0">
          <h3 style="color:#856404;margin:0 0 8px">⏳ Account Pending TSC Verification</h3>
          <p style="color:#856404;margin:0">Your account is <strong>restricted</strong> until TSC verification is complete.</p>
        </div>
        <table style="width:100%;border-collapse:collapse;margin:16px 0">
          <tr><td style="padding:8px;background:#f7fafc;font-weight:600">TSC Number</td><td style="padding:8px"><b>${cleanTsc}</b></td></tr>
          <tr><td style="padding:8px;background:#f7fafc;font-weight:600">Staff Number</td><td style="padding:8px">${staffNumber}</td></tr>
          <tr><td style="padding:8px;background:#f7fafc;font-weight:600">Temp Password</td><td style="padding:8px;font-size:18px;font-weight:800;color:#e53e3e">${result.tempPwd}</td></tr>
          <tr><td style="padding:8px;background:#f7fafc;font-weight:600">Verification Score</td><td style="padding:8px">${result.initialScore}/100 — ${result.initialScore < 40 ? '🔴 Upload documents urgently' : '🟡 Awaiting documents'}</td></tr>
        </table>
        <div style="background:#e8f5e9;border:1px solid #4caf50;border-radius:8px;padding:16px;margin:16px 0">
          <h3 style="color:#2e7d32;margin:0 0 8px">📋 Steps to Get Full Access</h3>
          <ol style="color:#1b5e20;padding-left:20px">
            <li>Login and change your temporary password</li>
            <li>Upload your <b>TSC Certificate</b></li>
            <li>Upload your <b>National ID</b> (front + back)</li>
            <li>Await Dean of Studies approval</li>
          </ol>
        </div>
        <p style="color:#e53e3e;font-weight:600">⚠️ Marks entry, student records, and sensitive actions are blocked until fully verified (100/100).</p>
        <a href="${process.env.FRONTEND_URL}" style="display:inline-block;background:#1a365d;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none">Login & Upload Documents</a>
      </div>
    `).catch(() => {});
  }

  res.status(201).json({
    message: 'Teacher registered. Account is PENDING verification.',
    status: 'pending',
    verificationScore: result.initialScore,
    staffId: result.staff.id,
    userId: result.user.id,
    verificationId: result.verif.id,
    tempPassword: result.tempPwd,
    nextSteps: ['Upload TSC Certificate and National ID', 'Dean reviews and approves documents', 'Teacher gets full access at 100/100'],
    fraudWarnings: fraudPreCheck.flags.map(f => ({ type: f.type, severity: f.severity })),
  });
};

// ============================================================
// STEP 3: UPLOAD DOCUMENTS
// POST /api/dean/verification/:verificationId/documents
// ============================================================
const uploadVerificationDocument = async (req, res) => {
  const { verificationId } = req.params;
  const { documentType, fileUrl, fileName, fileSize, mimeType, extractedName, extractedId, extractedTsc, extractionConfidence } = req.body;

  if (!documentType || !fileUrl) return res.status(400).json({ error: 'documentType and fileUrl required' });
  const validTypes = ['tsc_certificate', 'national_id_front', 'national_id_back', 'passport', 'academic_certificate', 'employment_letter'];
  if (!validTypes.includes(documentType)) return res.status(400).json({ error: `documentType must be: ${validTypes.join(', ')}` });

  const { rows: verifRows } = await query('SELECT * FROM tsc_verifications WHERE id=$1 AND school_id=$2', [verificationId, req.schoolId]);
  if (!verifRows.length) return res.status(404).json({ error: 'Verification not found' });
  const verif = verifRows[0];

  const isOwner = verif.user_id === req.user.id;
  const isAdmin = ['dean_of_studies', 'principal', 'school_admin', 'super_admin'].includes(req.user.role);
  if (!isOwner && !isAdmin) return res.status(403).json({ error: 'Access denied' });

  await query(
    `INSERT INTO verification_documents(verification_id, school_id, staff_id, user_id, document_type, file_url, file_name, file_size, mime_type, extracted_name, extracted_id, extracted_tsc, extraction_confidence)
     VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
     ON CONFLICT DO NOTHING`,
    [verificationId, req.schoolId, verif.staff_id, verif.user_id, documentType, fileUrl, fileName, fileSize, mimeType, extractedName, extractedId, extractedTsc, extractionConfidence]
  );

  const docsResult = await tscEngine.checkDocuments(verificationId);
  const tscDoc = docsResult.uploadedDocs.find(d => d.document_type === 'tsc_certificate');
  const idDoc  = docsResult.uploadedDocs.find(d => ['national_id_front', 'passport'].includes(d.document_type));

  const nameMatch = tscDoc?.extracted_name ? tscEngine.matchName(verif.submitted_first_name, verif.submitted_last_name, tscDoc.extracted_name) : { score: 0, pass: false, confidence: 0 };
  const idMatch   = idDoc?.extracted_id    ? tscEngine.matchNationalId(verif.submitted_national_id, idDoc.extracted_id) : { score: 0, match: false };

  if (tscDoc?.extracted_tsc && tscDoc.extracted_tsc !== verif.submitted_tsc) {
    await query(
      `INSERT INTO tsc_fraud_flags(school_id, staff_id, user_id, flag_type, description, severity, metadata)
       VALUES($1,$2,$3,'tsc_certificate_mismatch',$4,'critical',$5::jsonb)`,
      [req.schoolId, verif.staff_id, verif.user_id,
       `TSC certificate shows "${tscDoc.extracted_tsc}" but submitted was "${verif.submitted_tsc}"`,
       JSON.stringify({ extracted: tscDoc.extracted_tsc, submitted: verif.submitted_tsc })]
    ).catch(() => {});
  }

  const newScore = verif.score_format_valid + verif.score_no_duplicate + verif.score_no_global_dup
    + docsResult.score + nameMatch.score + idMatch.score;

  await query(
    `UPDATE tsc_verifications SET score_docs_uploaded=$1, score_name_match=$2, score_id_match=$3,
       name_match_result=$4::jsonb, id_match_confirmed=$5, status='under_review', updated_at=NOW()
     WHERE id=$6`,
    [docsResult.score, nameMatch.score, idMatch.score, JSON.stringify(nameMatch), idMatch.match, verificationId]
  );
  await query(
    'UPDATE staff SET tsc_verification_score=$1, documents_submitted_at=NOW(), tsc_verification_status=$2 WHERE id=$3',
    [newScore, newScore >= tscEngine.MIN_SCORE_FOR_ACCESS ? 'under_review' : 'pending', verif.staff_id]
  );

  // Notify deans
  const { rows: deans } = await query(
    `SELECT u.phone FROM users u WHERE u.school_id=$1 AND u.role IN ('dean_of_studies','principal')`,
    [req.schoolId]
  );
  for (const d of deans) {
    smsService.send(d.phone, `ElimuSaaS: ${verif.submitted_first_name} ${verif.submitted_last_name} has uploaded verification docs (Score: ${newScore}/100). Please review.`).catch(() => {});
  }

  res.status(201).json({
    message: `Document uploaded. Verification score: ${newScore}/100`,
    updatedScore: newScore,
    status: 'under_review',
    nameMatch: { passed: nameMatch.pass || false, confidence: nameMatch.confidence },
    idMatch: { matched: idMatch.match },
    remainingToFullAccess: `${tscEngine.FULL_SCORE - newScore} points remaining (Admin approval needed)`,
  });
};

// ============================================================
// STEP 4: ADMIN REVIEW
// PUT /api/dean/verification/:verificationId/review
// ============================================================
const reviewVerification = async (req, res) => {
  const allowed = ['dean_of_studies', 'principal', 'school_admin', 'super_admin'];
  if (!allowed.includes(req.user.role)) return res.status(403).json({ error: 'Only Dean/Admin can review' });

  const { action, adminNotes, rejectionReason, tscPortalChecked, tscPortalResult } = req.body;
  if (!['approve', 'reject', 'flag'].includes(action)) {
    return res.status(400).json({ error: 'action must be: approve, reject, or flag' });
  }

  const { rows: verifRows } = await query(
    `SELECT tv.*, u.email, u.phone, u.first_name, u.last_name
     FROM tsc_verifications tv JOIN users u ON tv.user_id=u.id
     WHERE tv.id=$1 AND tv.school_id=$2`,
    [req.params.verificationId, req.schoolId]
  );
  if (!verifRows.length) return res.status(404).json({ error: 'Verification not found' });
  const verif = verifRows[0];

  const newStatus = action === 'approve' ? 'verified' : action === 'reject' ? 'rejected' : 'flagged';
  const adminScore = action === 'approve' ? tscEngine.SCORE_WEIGHTS.ADMIN_APPROVED : 0;
  const finalScore = parseInt(verif.total_score || 0) + adminScore;

  await withTransaction(async (client) => {
    await client.query(
      `UPDATE tsc_verifications SET status=$1, score_admin_approved=$2, reviewed_by=$3,
         reviewed_at=NOW(), admin_notes=$4, rejection_reason=$5,
         tsc_portal_checked=$6, tsc_portal_result=$7::jsonb, updated_at=NOW()
       WHERE id=$8`,
      [newStatus, adminScore, req.user.id, adminNotes, rejectionReason || null,
       tscPortalChecked || false, JSON.stringify(tscPortalResult || {}), req.params.verificationId]
    );
    await client.query(
      `UPDATE staff SET tsc_verification_status=$1, tsc_verification_score=$2,
         tsc_verified_at=$3, tsc_verified_by=$4, tsc_rejection_reason=$5 WHERE id=$6`,
      [newStatus, finalScore, action === 'approve' ? new Date() : null,
       action === 'approve' ? req.user.id : null, rejectionReason || null, verif.staff_id]
    );
    await client.query(
      'UPDATE users SET tsc_verification_status=$1, is_tsc_verified=$2 WHERE id=$3',
      [newStatus, action === 'approve', verif.user_id]
    );
    if (tscPortalChecked) {
      await client.query(
        `INSERT INTO tsc_portal_checks(verification_id, school_id, checked_by, tsc_number, result, portal_data, notes)
         VALUES($1,$2,$3,$4,$5,$6::jsonb,$7)`,
        [req.params.verificationId, req.schoolId, req.user.id, verif.submitted_tsc,
         tscPortalResult?.result || 'matched', JSON.stringify(tscPortalResult || {}), adminNotes]
      );
    }
    await client.query(
      `INSERT INTO audit_logs(school_id, user_id, action, entity_type, entity_id, new_data)
       VALUES($1,$2,$3,'tsc_verifications',$4,$5::jsonb)`,
      [req.schoolId, req.user.id, `TSC_${action.toUpperCase()}`, req.params.verificationId,
       JSON.stringify({ action, finalScore, tscNumber: verif.submitted_tsc })]
    );
  });

  const contact = { phone: verif.phone, email: verif.email, name: `${verif.first_name} ${verif.last_name}` };
  const msgs = {
    approve: `✅ Your TSC verification has been approved! You now have full access to ElimuSaaS. TSC: ${verif.submitted_tsc}`,
    reject:  `❌ TSC verification not approved. Reason: ${rejectionReason}. Contact the Dean of Studies.`,
    flag:    `⚠️ Your account has been flagged for investigation. Contact the Dean of Studies immediately.`,
  };
  sendVerifNotification(verif.staff_id, req.schoolId, `tsc_${action}d`, msgs[action], contact);

  res.json({ message: `Verification ${action}d`, status: newStatus, finalScore, teacherName: `${verif.first_name} ${verif.last_name}` });
};

// ============================================================
// DASHBOARD & MANAGEMENT
// ============================================================
const getVerifications = async (req, res) => {
  const { status, page = 1, limit = 30 } = req.query;
  let sql = `
    SELECT tv.*, u.first_name, u.last_name, u.email, u.phone, s.staff_number, s.department,
           COUNT(vd.id) as docs_uploaded,
           COUNT(ff.id) FILTER (WHERE ff.resolved=false) as open_flags
    FROM tsc_verifications tv JOIN users u ON tv.user_id=u.id JOIN staff s ON tv.staff_id=s.id
    LEFT JOIN verification_documents vd ON vd.verification_id=tv.id
    LEFT JOIN tsc_fraud_flags ff ON ff.staff_id=tv.staff_id
    WHERE tv.school_id=$1
  `;
  const params = [req.schoolId]; let i = 2;
  if (status) { sql += ` AND tv.status=$${i++}`; params.push(status); }
  sql += ' GROUP BY tv.id, u.id, s.id ORDER BY tv.created_at DESC';
  const result = await paginatedQuery(sql, params, parseInt(page), parseInt(limit));
  const { rows: counts } = await query('SELECT status, COUNT(*) as count FROM tsc_verifications WHERE school_id=$1 GROUP BY status', [req.schoolId]);
  res.json({ ...result, summary: counts });
};

const getVerificationDetail = async (req, res) => {
  const { rows: verifRows } = await query(
    `SELECT tv.*, u.first_name, u.last_name, u.email, u.phone, u.national_id,
            s.staff_number, s.designation, s.department,
            rev.first_name||' '||rev.last_name as reviewed_by_name
     FROM tsc_verifications tv JOIN users u ON tv.user_id=u.id JOIN staff s ON tv.staff_id=s.id
     LEFT JOIN users rev ON tv.reviewed_by=rev.id
     WHERE tv.id=$1 AND tv.school_id=$2`,
    [req.params.verificationId, req.schoolId]
  );
  if (!verifRows.length) return res.status(404).json({ error: 'Verification not found' });
  const v = verifRows[0];
  const { rows: docs } = await query('SELECT * FROM verification_documents WHERE verification_id=$1', [req.params.verificationId]);
  const { rows: flags } = await query('SELECT * FROM tsc_fraud_flags WHERE staff_id=$1 ORDER BY created_at DESC', [v.staff_id]);
  const { rows: portalChecks } = await query('SELECT * FROM tsc_portal_checks WHERE verification_id=$1', [req.params.verificationId]);
  const W = tscEngine.SCORE_WEIGHTS;
  const scoreBreakdown = [
    { layer: 'Format Validation',   score: v.score_format_valid,   max: W.FORMAT_VALID,   passed: v.score_format_valid > 0 },
    { layer: 'No School Duplicate', score: v.score_no_duplicate,   max: W.NO_SCHOOL_DUP,  passed: v.score_no_duplicate > 0 },
    { layer: 'No Global Duplicate', score: v.score_no_global_dup,  max: W.NO_GLOBAL_DUP,  passed: v.score_no_global_dup > 0 },
    { layer: 'Documents Uploaded',  score: v.score_docs_uploaded,  max: W.DOCS_UPLOADED,  passed: v.score_docs_uploaded >= W.DOCS_UPLOADED },
    { layer: 'Name Match',          score: v.score_name_match,     max: W.NAME_MATCH,     passed: v.score_name_match >= W.NAME_MATCH },
    { layer: 'National ID Match',   score: v.score_id_match,       max: W.ID_MATCH,       passed: v.score_id_match >= W.ID_MATCH },
    { layer: 'Admin Approval',      score: v.score_admin_approved, max: W.ADMIN_APPROVED, passed: v.score_admin_approved > 0 },
  ];
  res.json({
    verification: v, scoreBreakdown, totalScore: v.total_score,
    documents: docs, fraudFlags: flags, portalChecks,
    accessLevel: v.total_score >= tscEngine.FULL_SCORE ? 'full' : v.total_score >= tscEngine.MIN_SCORE_FOR_ACCESS ? 'restricted' : 'blocked',
  });
};

const requireTscVerified = async (req, res, next) => {
  const bypass = ['super_admin', 'school_admin', 'principal', 'dean_of_studies', 'bursar', 'librarian', 'admission_teacher'];
  if (bypass.includes(req.user.role)) return next();
  if (!req.user.is_tsc_verified) {
    const { rows } = await query('SELECT tsc_verification_status, tsc_verification_score FROM users WHERE id=$1', [req.user.id]).catch(() => ({ rows: [] }));
    const status = rows[0]?.tsc_verification_status || 'pending';
    const score  = rows[0]?.tsc_verification_score  || 0;
    const messages = {
      pending:      'Your account is pending TSC verification. Upload your TSC certificate and National ID.',
      under_review: 'Your documents are under review. You will be notified once approved.',
      rejected:     'Your TSC verification was rejected. Contact the Dean of Studies.',
      flagged:      'Your account has been flagged. Contact the Dean of Studies immediately.',
    };
    return res.status(403).json({ error: messages[status] || 'TSC verification required.', code: 'TSC_UNVERIFIED', status, score, maxScore: tscEngine.FULL_SCORE });
  }
  next();
};

const getFraudFlags = async (req, res) => {
  const { resolved, severity } = req.query;
  let sql = `SELECT ff.*, u.first_name, u.last_name, u.email, s.staff_number, s.tsc_number FROM tsc_fraud_flags ff LEFT JOIN users u ON ff.user_id=u.id LEFT JOIN staff s ON ff.staff_id=s.id WHERE ff.school_id=$1`;
  const params = [req.schoolId]; let i = 2;
  if (resolved !== undefined) { sql += ` AND ff.resolved=$${i++}`; params.push(resolved === 'true'); }
  if (severity) { sql += ` AND ff.severity=$${i++}`; params.push(severity); }
  sql += ' ORDER BY ff.created_at DESC';
  const { rows } = await query(sql, params);
  res.json(rows);
};

const resolveFraudFlag = async (req, res) => {
  const { note } = req.body;
  await query('UPDATE tsc_fraud_flags SET resolved=true, resolved_by=$1, resolved_at=NOW(), resolution_note=$2 WHERE id=$3 AND school_id=$4', [req.user.id, note, req.params.flagId, req.schoolId]);
  res.json({ message: 'Flag resolved' });
};

const getTeachers = async (req, res) => {
  const { page=1, limit=30, search, department, role, hasLoggedIn, verificationStatus } = req.query;
  let sql = `
    SELECT s.id as staff_id, s.staff_number, s.tsc_number, s.designation, s.department,
           s.employment_type, s.is_active, s.is_hod, s.tsc_verification_status, s.tsc_verification_score,
           u.id as user_id, u.first_name, u.last_name, u.email, u.phone, u.role,
           u.last_login, u.must_change_password, u.photo_url, u.is_tsc_verified,
           CASE WHEN u.last_login IS NULL THEN false ELSE true END as has_logged_in,
           COUNT(cs.id) as subjects_count
    FROM staff s JOIN users u ON s.user_id=u.id
    LEFT JOIN class_subjects cs ON cs.teacher_id=u.id AND cs.school_id=s.school_id
    WHERE s.school_id=$1
  `;
  const params = [req.schoolId]; let i = 2;
  if (department) { sql += ` AND s.department=$${i++}`; params.push(department); }
  if (role) { sql += ` AND u.role=$${i++}`; params.push(role); }
  if (verificationStatus) { sql += ` AND s.tsc_verification_status=$${i++}`; params.push(verificationStatus); }
  if (hasLoggedIn === 'false') sql += ' AND u.last_login IS NULL';
  if (hasLoggedIn === 'true')  sql += ' AND u.last_login IS NOT NULL';
  if (search) { sql += ` AND (u.first_name ILIKE $${i} OR u.last_name ILIKE $${i} OR s.tsc_number ILIKE $${i} OR s.staff_number ILIKE $${i})`; params.push(`%${search}%`); i++; }
  sql += ' GROUP BY s.id, u.id ORDER BY s.tsc_verification_status, u.first_name';
  res.json(await paginatedQuery(sql, params, parseInt(page), parseInt(limit)));
};

const resetTeacherPassword = async (req, res) => {
  const { rows: staffRows } = await query(`SELECT s.*, u.tsc_number, u.email, u.phone, u.first_name FROM staff s JOIN users u ON s.user_id=u.id WHERE s.id=$1 AND s.school_id=$2`, [req.params.staffId, req.schoolId]);
  if (!staffRows.length) return res.status(404).json({ error: 'Staff not found' });
  const staff = staffRows[0];
  const newTempPwd = `TSC${(staff.tsc_number||staff.staff_number).slice(-4)}${(staff.phone||'0000').slice(-4)}`.toUpperCase();
  const hash = await bcrypt.hash(newTempPwd, 12);
  await query('UPDATE users SET password_hash=$1, must_change_password=true WHERE id=$2', [hash, staff.user_id]);
  if (staff.phone) smsService.send(staff.phone, `ElimuSaaS password reset. Temp pwd: ${newTempPwd}. Change on login.`).catch(() => {});
  res.json({ message: 'Password reset', tempPassword: newTempPwd });
};

const deactivateTeacher = async (req, res) => {
  await withTransaction(async (client) => {
    await client.query('UPDATE staff SET is_active=false WHERE id=$1 AND school_id=$2', [req.params.staffId, req.schoolId]);
    const { rows } = await client.query('SELECT user_id FROM staff WHERE id=$1', [req.params.staffId]);
    if (rows.length) await client.query('UPDATE users SET is_active=false WHERE id=$1', [rows[0].user_id]);
  });
  res.json({ message: 'Teacher deactivated' });
};

const reportIncident = async (req, res) => {
  const { studentId, incidentDate, incidentTime, location, severity, category, description, witnesses, studentStatement, actionTaken, actionDetails } = req.body;
  if (!studentId || !description) return res.status(400).json({ error: 'studentId and description required' });
  const { rows } = await query(
    `INSERT INTO discipline_incidents(school_id,student_id,reported_by,incident_date,incident_time,location,severity,category,description,witnesses,student_statement,action_taken,action_details)
     VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13) RETURNING *`,
    [req.schoolId, studentId, req.user.id, incidentDate||new Date().toISOString().split('T')[0], incidentTime, location, severity||'minor', category, description, witnesses, studentStatement, actionTaken, actionDetails]
  );
  res.status(201).json(rows[0]);
};

const getIncidents = async (req, res) => {
  const { page=1, limit=30, studentId, severity, resolved, classId } = req.query;
  let sql = `SELECT di.*, s.first_name, s.last_name, s.admission_number, c.name as class_name, u.first_name||' '||u.last_name as reported_by_name FROM discipline_incidents di JOIN students s ON di.student_id=s.id LEFT JOIN classes c ON s.current_class_id=c.id JOIN users u ON di.reported_by=u.id WHERE di.school_id=$1`;
  const params = [req.schoolId]; let i = 2;
  if (studentId) { sql += ` AND di.student_id=$${i++}`; params.push(studentId); }
  if (severity) { sql += ` AND di.severity=$${i++}`; params.push(severity); }
  if (classId) { sql += ` AND s.current_class_id=$${i++}`; params.push(classId); }
  if (resolved !== undefined) { sql += ` AND di.resolved=$${i++}`; params.push(resolved==='true'); }
  sql += ' ORDER BY di.incident_date DESC';
  res.json(await paginatedQuery(sql, params, parseInt(page), parseInt(limit)));
};

const getStudentDisciplineHistory = async (req, res) => {
  const { rows: incidents } = await query(`SELECT di.*, u.first_name||' '||u.last_name as reporter FROM discipline_incidents di JOIN users u ON di.reported_by=u.id WHERE di.student_id=$1 AND di.school_id=$2 ORDER BY di.incident_date DESC`, [req.params.studentId, req.schoolId]);
  const { rows: suspensions } = await query(`SELECT sr.*, u.first_name||' '||u.last_name as issued_by_name FROM suspension_records sr JOIN users u ON sr.issued_by=u.id WHERE sr.student_id=$1 AND sr.school_id=$2 ORDER BY sr.start_date DESC`, [req.params.studentId, req.schoolId]);
  res.json({ incidents, suspensions });
};

module.exports = {
  preValidateTsc, registerTeacher, uploadVerificationDocument, reviewVerification,
  getVerifications, getVerificationDetail, requireTscVerified,
  getFraudFlags, resolveFraudFlag,
  getTeachers, resetTeacherPassword, deactivateTeacher,
  reportIncident, getIncidents, getStudentDisciplineHistory,
};
