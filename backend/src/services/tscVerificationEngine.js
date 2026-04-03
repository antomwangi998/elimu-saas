// ============================================================
// TSC Verification Engine
// Implements every verification layer:
// 1. Format validation
// 2. Duplicate detection (school + global)
// 3. Document presence check
// 4. Name fuzzy matching (Levenshtein + token sort)
// 5. National ID cross-check
// 6. Fraud pattern detection
// 7. Scoring (0–100) with access gating
// 8. Admin review workflow
// ============================================================
const { query, withTransaction } = require('../config/database');
const logger = require('../config/logger');

// ── Score thresholds ──────────────────────────────────────────
const SCORE_WEIGHTS = {
  FORMAT_VALID:    10,   // TSC is numeric, correct length
  NO_SCHOOL_DUP:   15,   // not used by anyone in same school
  NO_GLOBAL_DUP:   15,   // not used across entire platform
  DOCS_UPLOADED:   20,   // TSC cert + national ID uploaded
  NAME_MATCH:      20,   // name matches uploaded documents
  ID_MATCH:        10,   // national ID matches uploaded ID doc
  ADMIN_APPROVED:  10,   // admin has manually verified
};
// Total possible = 100

const MIN_SCORE_FOR_ACCESS = 70; // below this → restricted
const FULL_SCORE            = 100;

// ── TSC number format rules ───────────────────────────────────
// Kenya TSC numbers are typically 6–9 digits, all numeric
const TSC_REGEX    = /^\d{5,9}$/;
const TSC_MIN_LEN  = 5;
const TSC_MAX_LEN  = 9;

// ============================================================
// LAYER 1: FORMAT VALIDATION
// ============================================================
const validateTscFormat = (tscNumber) => {
  const clean = (tscNumber || '').toString().trim().replace(/\s+/g, '');

  const errors = [];
  if (!clean) {
    errors.push('TSC number is required.');
    return { valid: false, clean, errors, score: 0 };
  }
  if (!/^\d+$/.test(clean)) {
    errors.push('TSC number must contain digits only — no letters, spaces, or special characters.');
  }
  if (clean.length < TSC_MIN_LEN) {
    errors.push(`TSC number is too short (minimum ${TSC_MIN_LEN} digits).`);
  }
  if (clean.length > TSC_MAX_LEN) {
    errors.push(`TSC number is too long (maximum ${TSC_MAX_LEN} digits).`);
  }
  if (/^(.)\1+$/.test(clean)) {
    errors.push('TSC number cannot be all identical digits (e.g. 111111).');
  }
  if (/^(0+)$/.test(clean)) {
    errors.push('TSC number cannot be all zeros.');
  }
  if (['12345', '123456', '1234567', '12345678', '123456789'].includes(clean)) {
    errors.push('TSC number appears to be a sequential placeholder. Enter the real number.');
  }

  const valid = errors.length === 0;
  return {
    valid,
    clean,
    errors,
    score: valid ? SCORE_WEIGHTS.FORMAT_VALID : 0,
  };
};

// ============================================================
// LAYER 2: DUPLICATE DETECTION
// ============================================================
const checkDuplicates = async (tscNumber, staffId = null, schoolId) => {
  const flags = [];
  let schoolDupScore = SCORE_WEIGHTS.NO_SCHOOL_DUP;
  let globalDupScore = SCORE_WEIGHTS.NO_GLOBAL_DUP;

  // Check same school
  const { rows: schoolDup } = await query(
    `SELECT s.id, s.staff_number, u.first_name, u.last_name, u.email
     FROM staff s JOIN users u ON s.user_id=u.id
     WHERE s.school_id=$1 AND s.tsc_number=$2 ${staffId ? 'AND s.id != $3' : ''}`,
    staffId ? [schoolId, tscNumber, staffId] : [schoolId, tscNumber]
  );

  if (schoolDup.length > 0) {
    schoolDupScore = 0;
    flags.push({
      type: 'duplicate_within_school',
      description: `TSC number ${tscNumber} is already assigned to ${schoolDup[0].first_name} ${schoolDup[0].last_name} in this school.`,
      severity: 'critical',
      data: schoolDup[0],
    });
  }

  // Check across all schools (global)
  const { rows: globalDup } = await query(
    `SELECT u.id, u.first_name, u.last_name, u.email, s.name as school_name
     FROM users u
     LEFT JOIN schools s ON u.school_id=s.id
     WHERE u.tsc_number=$1 ${staffId ? `AND u.staff_id != $2` : ''}`,
    staffId ? [tscNumber, staffId] : [tscNumber]
  );

  if (globalDup.length > 0) {
    globalDupScore = 0;
    flags.push({
      type: 'duplicate_across_platform',
      description: `TSC number ${tscNumber} is already registered at ${globalDup[0].school_name || 'another school'} under ${globalDup[0].first_name} ${globalDup[0].last_name}.`,
      severity: 'critical',
      data: globalDup[0],
    });
  }

  // Also check pending verification submissions (could be fraud attempt)
  const { rows: pendingDup } = await query(
    `SELECT tv.id, tv.submitted_first_name, tv.submitted_last_name, sch.name as school_name
     FROM tsc_verifications tv JOIN schools sch ON tv.school_id=sch.id
     WHERE tv.submitted_tsc=$1 AND tv.status NOT IN ('rejected','flagged')
     ${staffId ? 'AND tv.staff_id != $2' : ''}`,
    staffId ? [tscNumber, staffId] : [tscNumber]
  );

  if (pendingDup.length > 0) {
    flags.push({
      type: 'pending_verification_conflict',
      description: `TSC number ${tscNumber} is currently under verification for another teacher at ${pendingDup[0].school_name}.`,
      severity: 'high',
      data: pendingDup[0],
    });
  }

  return {
    hasDuplicates: schoolDup.length > 0 || globalDup.length > 0,
    schoolDuplicates: schoolDup,
    globalDuplicates: globalDup,
    pendingConflicts: pendingDup,
    flags,
    schoolDupScore,
    globalDupScore,
  };
};

// ============================================================
// LAYER 3: DOCUMENT VERIFICATION
// ============================================================
const checkDocuments = async (verificationId) => {
  const { rows: docs } = await query(
    'SELECT * FROM verification_documents WHERE verification_id=$1',
    [verificationId]
  );

  const hasTscCert   = docs.some(d => d.document_type === 'tsc_certificate');
  const hasNationalId = docs.some(d => ['national_id_front', 'passport'].includes(d.document_type));
  const hasNationalIdBack = docs.some(d => d.document_type === 'national_id_back');

  const missingDocs = [];
  if (!hasTscCert)    missingDocs.push('TSC Certificate');
  if (!hasNationalId) missingDocs.push('National ID (front) or Passport');

  const score = (hasTscCert && hasNationalId)
    ? SCORE_WEIGHTS.DOCS_UPLOADED
    : hasTscCert || hasNationalId
      ? Math.floor(SCORE_WEIGHTS.DOCS_UPLOADED / 2)
      : 0;

  return {
    hasTscCert,
    hasNationalId,
    hasNationalIdBack,
    allRequiredPresent: hasTscCert && hasNationalId,
    missingDocs,
    uploadedDocs: docs,
    score,
  };
};

// ============================================================
// LAYER 4: NAME FUZZY MATCHING
// Levenshtein distance + token sort ratio
// ============================================================
const levenshtein = (a, b) => {
  const m = a.length, n = b.length;
  const dp = Array.from({ length: m + 1 }, (_, i) =>
    Array.from({ length: n + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0))
  );
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = a[i - 1] === b[j - 1]
        ? dp[i - 1][j - 1]
        : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
    }
  }
  return dp[m][n];
};

const stringSimilarity = (a, b) => {
  if (!a || !b) return 0;
  const s1 = a.toLowerCase().trim();
  const s2 = b.toLowerCase().trim();
  if (s1 === s2) return 1.0;
  const maxLen = Math.max(s1.length, s2.length);
  if (maxLen === 0) return 1.0;
  return (maxLen - levenshtein(s1, s2)) / maxLen;
};

const tokenSortRatio = (a, b) => {
  if (!a || !b) return 0;
  const sortTokens = (str) => str.toLowerCase().trim().split(/\s+/).sort().join(' ');
  return stringSimilarity(sortTokens(a), sortTokens(b));
};

const matchName = (submittedFirst, submittedLast, extractedName) => {
  if (!extractedName) return { score: 0, method: 'no_extracted_name', confidence: 0 };

  const fullSubmitted = `${submittedFirst} ${submittedLast}`;

  // Try multiple matching strategies
  const strategies = [
    { name: 'exact_full',       score: stringSimilarity(fullSubmitted, extractedName) },
    { name: 'token_sort',       score: tokenSortRatio(fullSubmitted, extractedName) },
    { name: 'first_name_only',  score: stringSimilarity(submittedFirst, extractedName.split(' ')[0]) },
    { name: 'last_name_only',   score: stringSimilarity(submittedLast, extractedName.split(' ').pop()) },
  ];

  const best = strategies.reduce((a, b) => a.score > b.score ? a : b);
  const confidence = best.score;
  const pass = confidence >= 0.75; // 75% similarity threshold

  return {
    confidence: parseFloat(confidence.toFixed(3)),
    method: best.name,
    strategies,
    pass,
    submittedName: fullSubmitted,
    extractedName,
    score: pass ? SCORE_WEIGHTS.NAME_MATCH : confidence >= 0.60 ? Math.floor(SCORE_WEIGHTS.NAME_MATCH / 2) : 0,
  };
};

// ============================================================
// LAYER 5: NATIONAL ID CROSS-CHECK
// ============================================================
const matchNationalId = (submittedId, extractedId) => {
  if (!extractedId) return { match: false, score: 0, reason: 'No ID extracted from document' };

  const clean1 = (submittedId || '').replace(/\s/g, '');
  const clean2 = (extractedId || '').replace(/\s/g, '');

  const exact = clean1 === clean2;
  const partial = clean1.slice(-6) === clean2.slice(-6); // last 6 digits

  return {
    match: exact,
    partialMatch: partial,
    score: exact ? SCORE_WEIGHTS.ID_MATCH : partial ? Math.floor(SCORE_WEIGHTS.ID_MATCH / 2) : 0,
    reason: exact ? 'Exact match' : partial ? 'Partial match (last 6 digits)' : 'No match',
  };
};

// ============================================================
// LAYER 6: FRAUD PATTERN DETECTION
// ============================================================
const detectFraudPatterns = async (tscNumber, firstName, lastName, nationalId, schoolId, staffId) => {
  const flags = [];
  let riskLevel = 'low';

  // Pattern 1: Same national ID used for different TSC numbers
  const { rows: idConflict } = await query(
    `SELECT u.tsc_number, u.first_name, u.last_name
     FROM users u WHERE u.national_id=$1 AND u.tsc_number != $2 AND u.tsc_number IS NOT NULL`,
    [nationalId, tscNumber]
  );
  if (idConflict.length > 0) {
    flags.push({
      type: 'national_id_tsc_mismatch',
      description: `National ID ${nationalId} is associated with a different TSC number (${idConflict[0].tsc_number}) under ${idConflict[0].first_name} ${idConflict[0].last_name}.`,
      severity: 'critical',
    });
    riskLevel = 'critical';
  }

  // Pattern 2: Same name registered across multiple schools with different TSC numbers
  const { rows: nameConflict } = await query(
    `SELECT u.tsc_number, s.name as school_name
     FROM users u JOIN schools s ON u.school_id=s.id
     WHERE LOWER(u.first_name)=LOWER($1) AND LOWER(u.last_name)=LOWER($2)
       AND u.tsc_number != $3 AND u.tsc_number IS NOT NULL`,
    [firstName, lastName, tscNumber]
  );
  if (nameConflict.length > 0) {
    flags.push({
      type: 'same_name_different_tsc',
      description: `A person with the same name (${firstName} ${lastName}) exists with TSC number ${nameConflict[0].tsc_number} at ${nameConflict[0].school_name}.`,
      severity: 'high',
    });
    riskLevel = riskLevel === 'critical' ? 'critical' : 'high';
  }

  // Pattern 3: Rapid re-submission (more than 3 attempts in 24 hours)
  const { rows: rapidResubmit } = await query(
    `SELECT COUNT(*) as attempts FROM tsc_verifications
     WHERE staff_id=$1 AND created_at >= NOW()-INTERVAL '24 hours'`,
    [staffId]
  );
  if (parseInt(rapidResubmit[0]?.attempts || 0) >= 3) {
    flags.push({
      type: 'rapid_resubmission',
      description: `${rapidResubmit[0].attempts} verification attempts in the last 24 hours for this staff account.`,
      severity: 'medium',
    });
    riskLevel = riskLevel === 'low' ? 'medium' : riskLevel;
  }

  // Pattern 4: TSC number numerically close to recently-rejected ones (sequential guessing)
  const { rows: seqGuess } = await query(
    `SELECT submitted_tsc FROM tsc_verifications
     WHERE status='rejected' AND school_id=$1
       AND ABS(submitted_tsc::BIGINT - $2::BIGINT) <= 10
       AND submitted_tsc != $2`,
    [schoolId, tscNumber]
  );
  if (seqGuess.length > 0) {
    flags.push({
      type: 'sequential_tsc_guessing',
      description: `TSC number ${tscNumber} is very close to ${seqGuess.length} recently-rejected number(s), suggesting guessing.`,
      severity: 'high',
    });
    riskLevel = riskLevel === 'critical' ? 'critical' : 'high';
  }

  // Pattern 5: National ID format check
  const kenyaIdRegex = /^\d{7,8}$/;
  if (nationalId && !kenyaIdRegex.test(nationalId.replace(/\s/g, ''))) {
    flags.push({
      type: 'invalid_national_id_format',
      description: `National ID "${nationalId}" does not match the Kenya national ID format (7–8 digits).`,
      severity: 'medium',
    });
  }

  return { flags, riskLevel, isFraud: riskLevel === 'critical' };
};

// ============================================================
// MASTER VERIFICATION PIPELINE
// Runs all layers and returns a comprehensive report
// ============================================================
const runVerificationPipeline = async ({
  staffId, userId, schoolId,
  tscNumber, firstName, lastName, nationalId, dateOfBirth,
  submittedBy, verificationId,
}) => {
  const report = {
    tscNumber,
    layers: {},
    totalScore: 0,
    flags: [],
    riskLevel: 'low',
    status: 'pending',
    canAccess: false,
    blockingIssues: [],
    recommendations: [],
  };

  // ── Layer 1: Format ───────────────────────────────────────
  const formatResult = validateTscFormat(tscNumber);
  report.layers.format = formatResult;
  report.totalScore += formatResult.score;
  if (!formatResult.valid) {
    report.blockingIssues.push(...formatResult.errors);
    return { ...report, status: 'rejected', canAccess: false };
  }

  // ── Layer 2: Duplicates ───────────────────────────────────
  const dupResult = await checkDuplicates(tscNumber, staffId, schoolId);
  report.layers.duplicates = dupResult;
  report.totalScore += dupResult.schoolDupScore + dupResult.globalDupScore;
  report.flags.push(...dupResult.flags);
  if (dupResult.hasDuplicates) {
    report.blockingIssues.push(`TSC number ${tscNumber} is already in use in the system.`);
  }

  // ── Layer 3: Documents ─────────────────────────────────────
  let docsResult = { score: 0, allRequiredPresent: false, missingDocs: ['TSC Certificate', 'National ID'] };
  if (verificationId) {
    docsResult = await checkDocuments(verificationId);
  }
  report.layers.documents = docsResult;
  report.totalScore += docsResult.score;
  if (!docsResult.allRequiredPresent && docsResult.missingDocs.length > 0) {
    report.recommendations.push(`Upload missing documents: ${docsResult.missingDocs.join(', ')}`);
  }

  // ── Layer 4 + 5: Name & ID match from documents ───────────
  let nameMatchResult = { score: 0, pass: false, reason: 'No document available' };
  let idMatchResult   = { score: 0, match: false, reason: 'No document available' };

  if (verificationId && docsResult.uploadedDocs) {
    const tscDoc = docsResult.uploadedDocs.find(d => d.document_type === 'tsc_certificate');
    const idDoc  = docsResult.uploadedDocs.find(d => ['national_id_front','passport'].includes(d.document_type));

    if (tscDoc?.extracted_name) {
      nameMatchResult = matchName(firstName, lastName, tscDoc.extracted_name);
    }
    if (idDoc?.extracted_id) {
      idMatchResult = matchNationalId(nationalId, idDoc.extracted_id);
    }
    if (tscDoc?.extracted_tsc && tscDoc.extracted_tsc !== tscNumber) {
      report.flags.push({
        type: 'tsc_doc_mismatch',
        description: `TSC certificate shows number "${tscDoc.extracted_tsc}" but submitted number is "${tscNumber}".`,
        severity: 'critical',
      });
      report.blockingIssues.push('TSC number does not match the uploaded certificate.');
    }
  }
  report.layers.nameMatch = nameMatchResult;
  report.layers.idMatch   = idMatchResult;
  report.totalScore += nameMatchResult.score + idMatchResult.score;

  if (!nameMatchResult.pass && docsResult.hasTscCert) {
    report.recommendations.push(`Name mismatch detected. Ensure the name entered matches the TSC certificate exactly (similarity: ${(nameMatchResult.confidence * 100).toFixed(0)}%).`);
  }

  // ── Layer 6: Fraud detection ──────────────────────────────
  const fraudResult = await detectFraudPatterns(tscNumber, firstName, lastName, nationalId, schoolId, staffId);
  report.layers.fraud = fraudResult;
  report.flags.push(...fraudResult.flags);
  report.riskLevel = fraudResult.riskLevel;

  if (fraudResult.isFraud) {
    report.blockingIssues.push('Critical fraud pattern detected. This registration has been flagged for investigation.');
    report.status = 'flagged';
  }

  // ── Determine overall status ──────────────────────────────
  const criticalFlags = report.flags.filter(f => f.severity === 'critical');
  const hasBlocking   = report.blockingIssues.length > 0 || criticalFlags.length > 0;

  if (report.status !== 'flagged') {
    if (hasBlocking || report.totalScore < 40) {
      report.status = 'pending'; // needs manual review
    } else if (report.totalScore >= MIN_SCORE_FOR_ACCESS) {
      report.status = 'under_review'; // good score, awaiting final admin sign-off
    } else {
      report.status = 'pending';
    }
  }

  // Access is only granted after admin_approved (score becomes 100)
  report.canAccess = report.totalScore >= FULL_SCORE && report.status === 'verified';

  return report;
};

// ============================================================
// EXPORTS
// ============================================================
module.exports = {
  validateTscFormat,
  checkDuplicates,
  checkDocuments,
  matchName,
  matchNationalId,
  detectFraudPatterns,
  runVerificationPipeline,
  SCORE_WEIGHTS,
  MIN_SCORE_FOR_ACCESS,
  FULL_SCORE,
};
