// ============================================================
// Club Subsystem Controller
// Full patron portal: subscriptions, minutes, finances,
// certificates, events, member management
// Works for: clubs, societies, games teams
// ============================================================
const { query, withTransaction, paginatedQuery } = require('../config/database');
const documentService = require('../services/documentService');

// ── Verify patron owns this club ──────────────────────────────
const verifyPatron = async (clubId, userId, schoolId) => {
  const { rows } = await query(
    `SELECT id FROM clubs
     WHERE id=$1 AND school_id=$2 AND (patron_id=$3 OR vice_patron_id=$3)`,
    [clubId, schoolId, userId]
  );
  return rows.length > 0;
};

// ============================================================
// CLUB OVERVIEW (Patron's Dashboard)
// ============================================================

// GET /api/clubs/:clubId/dashboard
const getClubDashboard = async (req, res) => {
  const { clubId } = req.params;
  const isAdmin = ['school_admin', 'principal', 'super_admin'].includes(req.user.role);
  const isPatron = await verifyPatron(clubId, req.user.id, req.schoolId);
  if (!isAdmin && !isPatron) return res.status(403).json({ error: 'Access denied' });

  const [clubRes, statsRes, recentMinutes, recentEvents, financeRes] = await Promise.allSettled([
    query(
      `SELECT cl.*, u.first_name||' '||u.last_name as patron_name,
              u2.first_name||' '||u2.last_name as vice_patron_name
       FROM clubs cl
       LEFT JOIN users u ON cl.patron_id=u.id
       LEFT JOIN users u2 ON cl.vice_patron_id=u2.id
       WHERE cl.id=$1 AND cl.school_id=$2`,
      [clubId, req.schoolId]
    ),
    query(
      `SELECT
         COUNT(cm.id) FILTER (WHERE cm.is_active=true) as total_members,
         COUNT(cm.id) FILTER (WHERE cm.role='chairperson') as chairpersons,
         COUNT(cm.id) FILTER (WHERE cm.joined_date >= NOW()-INTERVAL '30 days') as new_this_month,
         COALESCE(SUM(cs.amount),0) as total_subscriptions_collected
       FROM club_memberships cm
       LEFT JOIN club_subscriptions cs ON cs.club_id=cm.club_id AND cs.student_id=cm.student_id
       WHERE cm.club_id=$1 AND cm.school_id=$2`,
      [clubId, req.schoolId]
    ),
    query(
      'SELECT id, meeting_date, venue, attendance_count, is_approved FROM club_meeting_minutes WHERE club_id=$1 ORDER BY meeting_date DESC LIMIT 5',
      [clubId]
    ),
    query(
      'SELECT id, name, event_date, result, position FROM club_events WHERE club_id=$1 ORDER BY event_date DESC LIMIT 5',
      [clubId]
    ),
    query(
      `SELECT
         COALESCE(SUM(amount) FILTER (WHERE type='income'),0) as total_income,
         COALESCE(SUM(amount) FILTER (WHERE type='expense'),0) as total_expense
       FROM club_finances WHERE club_id=$1 AND school_id=$2`,
      [clubId, req.schoolId]
    ),
  ]);

  const club = clubRes.status === 'fulfilled' ? clubRes.value.rows[0] : null;
  if (!club) return res.status(404).json({ error: 'Club not found' });

  const finance = financeRes.status === 'fulfilled' ? financeRes.value.rows[0] : {};
  res.json({
    club,
    stats: statsRes.status === 'fulfilled' ? statsRes.value.rows[0] : {},
    recentMinutes: recentMinutes.status === 'fulfilled' ? recentMinutes.value.rows : [],
    recentEvents: recentEvents.status === 'fulfilled' ? recentEvents.value.rows : [],
    finance: {
      ...finance,
      balance: parseFloat(finance.total_income||0) - parseFloat(finance.total_expense||0),
    },
  });
};

// ============================================================
// MEMBERS & SUBSCRIPTIONS
// ============================================================

// GET /api/clubs/:clubId/members
const getMembers = async (req, res) => {
  const { clubId } = req.params;
  const { academicYearId, term, hasSubscribed, role: memberRole } = req.query;

  const { rows } = await query(
    `SELECT cm.id, cm.role, cm.joined_date, cm.is_active,
            s.id as student_id, s.admission_number,
            s.first_name, s.last_name, s.gender, s.photo_url,
            c.name as class_name,
            cs.id as subscription_id, cs.amount as sub_paid,
            cs.term as sub_term, cs.paid_at as sub_paid_at
     FROM club_memberships cm
     JOIN students s ON cm.student_id=s.id
     LEFT JOIN classes c ON s.current_class_id=c.id
     LEFT JOIN club_subscriptions cs ON cs.club_id=cm.club_id AND cs.student_id=cm.student_id
       ${academicYearId ? 'AND cs.academic_year_id=$3' : ''}
       ${term ? 'AND cs.term=$4' : ''}
     WHERE cm.club_id=$1 AND cm.school_id=$2 AND cm.is_active=true
     ${memberRole ? `AND cm.role='${memberRole}'` : ''}
     ORDER BY cm.role, s.first_name`,
    [clubId, req.schoolId,
     ...(academicYearId ? [academicYearId] : []),
     ...(term ? [term] : [])]
  );

  if (hasSubscribed === 'false') return res.json(rows.filter(m => !m.subscription_id));
  if (hasSubscribed === 'true') return res.json(rows.filter(m => m.subscription_id));
  res.json(rows);
};

// POST /api/clubs/:clubId/members/:studentId/subscribe
const recordSubscription = async (req, res) => {
  const { clubId, studentId } = req.params;
  const isAdmin = ['school_admin', 'principal', 'super_admin'].includes(req.user.role);
  const isPatron = await verifyPatron(clubId, req.user.id, req.schoolId);
  if (!isAdmin && !isPatron) return res.status(403).json({ error: 'Access denied' });

  const { amount, academicYearId, term, notes } = req.body;
  if (!amount || !term) return res.status(400).json({ error: 'amount and term required' });

  const receiptNo = `SUB-${clubId.slice(0,4).toUpperCase()}-${Date.now()}`;

  const { rows } = await query(
    `INSERT INTO club_subscriptions(
       school_id, club_id, student_id, academic_year_id, term,
       amount, received_by, receipt_number, notes
     ) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9)
     ON CONFLICT(club_id, student_id, academic_year_id, term) DO UPDATE SET
       amount=$6, received_by=$7, paid_at=NOW(), notes=$9
     RETURNING *`,
    [req.schoolId, clubId, studentId, academicYearId, term, amount, req.user.id, receiptNo, notes]
  );
  res.status(201).json(rows[0]);
};

// GET /api/clubs/:clubId/subscription-status?academicYearId=&term=
const getSubscriptionStatus = async (req, res) => {
  const { clubId } = req.params;
  const { academicYearId, term } = req.query;

  const { rows } = await query(
    `SELECT cm.id as membership_id, s.first_name, s.last_name, s.admission_number,
            c.name as class_name, cm.role as club_role,
            cs.id as subscription_id, cs.amount, cs.paid_at, cs.receipt_number,
            CASE WHEN cs.id IS NOT NULL THEN 'paid' ELSE 'unpaid' END as status
     FROM club_memberships cm
     JOIN students s ON cm.student_id=s.id
     LEFT JOIN classes c ON s.current_class_id=c.id
     LEFT JOIN club_subscriptions cs ON cs.club_id=cm.club_id AND cs.student_id=cm.student_id
       AND cs.academic_year_id=$3 AND cs.term=$4
     WHERE cm.club_id=$1 AND cm.school_id=$2 AND cm.is_active=true
     ORDER BY status, s.first_name`,
    [clubId, req.schoolId, academicYearId, term]
  );

  const paid = rows.filter(r => r.status === 'paid').length;
  res.json({
    members: rows,
    summary: { total: rows.length, paid, unpaid: rows.length - paid },
  });
};

// ============================================================
// MEETING MINUTES
// ============================================================

// GET /api/clubs/:clubId/minutes
const getMeetingMinutes = async (req, res) => {
  const { clubId } = req.params;
  const { rows } = await query(
    `SELECT mm.*, u.first_name||' '||u.last_name as recorded_by_name,
            s1.first_name||' '||s1.last_name as chairperson_name,
            s2.first_name||' '||s2.last_name as secretary_name
     FROM club_meeting_minutes mm
     LEFT JOIN users u ON mm.recorded_by=u.id
     LEFT JOIN students s1 ON mm.chairperson_id=s1.id
     LEFT JOIN students s2 ON mm.secretary_id=s2.id
     WHERE mm.club_id=$1 AND mm.school_id=$2
     ORDER BY mm.meeting_date DESC`,
    [clubId, req.schoolId]
  );
  res.json(rows);
};

// POST /api/clubs/:clubId/minutes
const createMinutes = async (req, res) => {
  const { clubId } = req.params;
  const isAdmin = ['school_admin', 'principal', 'super_admin'].includes(req.user.role);
  const isPatron = await verifyPatron(clubId, req.user.id, req.schoolId);
  if (!isAdmin && !isPatron) return res.status(403).json({ error: 'Only patron can record minutes' });

  const {
    meetingDate, meetingTime, venue, chairpersonId, secretaryId,
    attendees, attendanceCount, agenda, minutesText, actionItems, nextMeetingDate,
  } = req.body;

  if (!meetingDate) return res.status(400).json({ error: 'meetingDate required' });

  const { rows } = await query(
    `INSERT INTO club_meeting_minutes(
       school_id, club_id, meeting_date, meeting_time, venue,
       chairperson_id, secretary_id, attendees, attendance_count,
       agenda, minutes_text, action_items, next_meeting_date, recorded_by
     ) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14) RETURNING *`,
    [
      req.schoolId, clubId, meetingDate, meetingTime, venue,
      chairpersonId, secretaryId, attendees || [], attendanceCount || 0,
      JSON.stringify(agenda || []), minutesText,
      JSON.stringify(actionItems || []), nextMeetingDate, req.user.id,
    ]
  );
  res.status(201).json(rows[0]);
};

// PUT /api/clubs/:clubId/minutes/:minutesId/approve
const approveMinutes = async (req, res) => {
  const { rows } = await query(
    'UPDATE club_meeting_minutes SET is_approved=true, approved_at=NOW() WHERE id=$1 AND school_id=$2 RETURNING *',
    [req.params.minutesId, req.schoolId]
  );
  if (!rows.length) return res.status(404).json({ error: 'Minutes not found' });
  res.json(rows[0]);
};

// GET /api/clubs/:clubId/minutes/:minutesId/pdf
const downloadMinutesPdf = async (req, res) => {
  const { rows: minutesRows } = await query(
    'SELECT * FROM club_meeting_minutes WHERE id=$1 AND school_id=$2',
    [req.params.minutesId, req.schoolId]
  );
  if (!minutesRows.length) return res.status(404).json({ error: 'Minutes not found' });

  const { rows: clubRows } = await query(
    'SELECT cl.*, sch.name as school_name, sch.logo_url, sch.address, sch.phone FROM clubs cl JOIN schools sch ON cl.school_id=sch.id WHERE cl.id=$1',
    [req.params.clubId]
  );

  const school = { name: clubRows[0]?.school_name, logo_url: clubRows[0]?.logo_url, address: clubRows[0]?.address, phone: clubRows[0]?.phone };
  const pdf = await documentService.generateMeetingMinutesPdf({
    school, club: clubRows[0], minutes: minutesRows[0],
  });

  res.set('Content-Type', 'application/pdf');
  res.set('Content-Disposition', `attachment; filename="minutes-${req.params.minutesId}.pdf"`);
  res.send(pdf);
};

// ============================================================
// FINANCES
// ============================================================

// GET /api/clubs/:clubId/finances
const getFinances = async (req, res) => {
  const { clubId } = req.params;
  const { type, from, to } = req.query;

  let sql = `SELECT cf.*, u.first_name||' '||u.last_name as recorded_by_name
             FROM club_finances cf LEFT JOIN users u ON cf.recorded_by=u.id
             WHERE cf.club_id=$1 AND cf.school_id=$2`;
  const params = [clubId, req.schoolId]; let i = 3;
  if (type) { sql += ` AND cf.type=$${i++}`; params.push(type); }
  if (from) { sql += ` AND cf.transaction_date >= $${i++}`; params.push(from); }
  if (to) { sql += ` AND cf.transaction_date <= $${i++}`; params.push(to); }
  sql += ' ORDER BY cf.transaction_date DESC';

  const { rows } = await query(sql, params);
  const income = rows.filter(r => r.type === 'income').reduce((s, r) => s + parseFloat(r.amount), 0);
  const expense = rows.filter(r => r.type === 'expense').reduce((s, r) => s + parseFloat(r.amount), 0);

  res.json({ transactions: rows, summary: { income, expense, balance: income - expense } });
};

// POST /api/clubs/:clubId/finances
const recordFinance = async (req, res) => {
  const { clubId } = req.params;
  const isAdmin = ['school_admin', 'principal', 'super_admin'].includes(req.user.role);
  const isPatron = await verifyPatron(clubId, req.user.id, req.schoolId);
  if (!isAdmin && !isPatron) return res.status(403).json({ error: 'Access denied' });

  const { transactionDate, type, category, description, amount } = req.body;
  if (!type || !description || !amount) return res.status(400).json({ error: 'type, description, amount required' });

  // Calculate running balance
  const { rows: lastRows } = await query(
    'SELECT balance_after FROM club_finances WHERE club_id=$1 ORDER BY transaction_date DESC, created_at DESC LIMIT 1',
    [clubId]
  );
  const lastBalance = parseFloat(lastRows[0]?.balance_after || 0);
  const newBalance = type === 'income' ? lastBalance + parseFloat(amount) : lastBalance - parseFloat(amount);

  const { rows } = await query(
    `INSERT INTO club_finances(school_id, club_id, transaction_date, type, category, description, amount, balance_after, recorded_by)
     VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
    [req.schoolId, clubId, transactionDate || new Date().toISOString().split('T')[0], type, category, description, amount, newBalance, req.user.id]
  );
  res.status(201).json(rows[0]);
};

// ============================================================
// CERTIFICATES (Patron generates for members)
// ============================================================

// POST /api/clubs/:clubId/certificates
const issueCertificate = async (req, res) => {
  const { clubId } = req.params;
  const isAdmin = ['school_admin', 'principal', 'super_admin', 'games_teacher'].includes(req.user.role);
  const isPatron = await verifyPatron(clubId, req.user.id, req.schoolId);
  if (!isAdmin && !isPatron) return res.status(403).json({ error: 'Access denied' });

  const { studentId, type, title, description, issuedDate, position } = req.body;
  if (!studentId || !title) return res.status(400).json({ error: 'studentId and title required' });

  const { rows } = await query(
    `INSERT INTO certificates(
       school_id, student_id, club_id, type, title, description,
       issued_date, issued_by, recipient_name
     )
     SELECT $1, $2, $3, $4, $5, $6, $7, $8,
            first_name||' '||last_name
     FROM students WHERE id=$2
     RETURNING *`,
    [req.schoolId, studentId, clubId, type || 'participation', title, description,
     issuedDate || new Date().toISOString().split('T')[0], req.user.id]
  );
  res.status(201).json(rows[0]);
};

// GET /api/clubs/:clubId/certificates/:certId/pdf
const downloadCertificate = async (req, res) => {
  const { rows: certRows } = await query(
    `SELECT cert.*,
            s.first_name, s.last_name, s.admission_number, s.photo_url,
            c.name as class_name,
            sch.name as school_name, sch.logo_url, sch.address, sch.phone,
            sch.motto,
            u.first_name||' '||u.last_name as issued_by_name,
            u.role as issued_by_title
     FROM certificates cert
     JOIN students s ON cert.student_id=s.id
     LEFT JOIN classes c ON s.current_class_id=c.id
     JOIN schools sch ON cert.school_id=sch.id
     LEFT JOIN users u ON cert.issued_by=u.id
     WHERE cert.id=$1 AND cert.school_id=$2`,
    [req.params.certId, req.schoolId]
  );
  if (!certRows.length) return res.status(404).json({ error: 'Certificate not found' });
  const cert = certRows[0];

  const pdf = await documentService.generateCertificate({
    school: { name: cert.school_name, logo_url: cert.logo_url, address: cert.address, phone: cert.phone, motto: cert.motto },
    student: { first_name: cert.first_name, last_name: cert.last_name, admission_number: cert.admission_number, class_name: cert.class_name },
    certificate: cert,
  });

  res.set('Content-Type', 'application/pdf');
  res.set('Content-Disposition', `attachment; filename="certificate-${cert.certificate_number}.pdf"`);
  res.send(pdf);
};

// GET /api/clubs/:clubId/certificates
const getClubCertificates = async (req, res) => {
  const { rows } = await query(
    `SELECT cert.*, s.first_name, s.last_name, s.admission_number, c.name as class_name
     FROM certificates cert
     JOIN students s ON cert.student_id=s.id
     LEFT JOIN classes c ON s.current_class_id=c.id
     WHERE cert.club_id=$1 AND cert.school_id=$2
     ORDER BY cert.issued_date DESC`,
    [req.params.clubId, req.schoolId]
  );
  res.json(rows);
};

module.exports = {
  getClubDashboard, getMembers, recordSubscription, getSubscriptionStatus,
  getMeetingMinutes, createMinutes, approveMinutes, downloadMinutesPdf,
  getFinances, recordFinance,
  issueCertificate, downloadCertificate, getClubCertificates,
};
