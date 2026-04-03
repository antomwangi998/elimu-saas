// ============================================================
// Notifications Controller — SMS, Email, In-App, Push
// ============================================================
const { query, withTransaction, paginatedQuery } = require('../config/database');
const smsService = require('../services/smsService');
const emailService = require('../services/emailService');

// ── GET /api/notifications ────────────────────────────────────
const getNotifications = async (req, res) => {
  const { page = 1, limit = 20, isRead, type } = req.query;

  let sql = `
    SELECT * FROM notifications
    WHERE school_id=$1 AND (user_id=$2 OR user_id IS NULL)
  `;
  const params = [req.schoolId, req.user.id];
  let i = 3;

  if (isRead !== undefined) { sql += ` AND is_read=$${i++}`; params.push(isRead === 'true'); }
  if (type) { sql += ` AND type=$${i++}`; params.push(type); }
  sql += ' ORDER BY created_at DESC';

  const result = await paginatedQuery(sql, params, parseInt(page), parseInt(limit));
  res.json(result);
};

// ── POST /api/notifications/mark-read ────────────────────────
const markRead = async (req, res) => {
  const { ids } = req.body; // array of notification ids, or empty = mark all

  if (ids?.length) {
    await query(
      'UPDATE notifications SET is_read=true, read_at=NOW() WHERE id=ANY($1) AND school_id=$2',
      [ids, req.schoolId]
    );
  } else {
    await query(
      'UPDATE notifications SET is_read=true, read_at=NOW() WHERE user_id=$1 AND school_id=$2 AND is_read=false',
      [req.user.id, req.schoolId]
    );
  }
  res.json({ message: 'Marked as read' });
};

// ── POST /api/notifications/send-sms ─────────────────────────
const sendSMS = async (req, res) => {
  const { recipients, message, recipientType, classId, all } = req.body;
  // recipientType: 'parents' | 'staff' | 'custom'

  let phones = [];

  if (all && recipientType === 'parents') {
    const { rows } = await query(
      `SELECT DISTINCT sp.phone FROM student_parents sp
       JOIN students s ON sp.student_id = s.id
       WHERE s.school_id=$1 AND s.is_active=true AND sp.phone IS NOT NULL`,
      [req.schoolId]
    );
    phones = rows.map(r => r.phone);
  } else if (classId && recipientType === 'parents') {
    const { rows } = await query(
      `SELECT DISTINCT sp.phone FROM student_parents sp
       JOIN students s ON sp.student_id = s.id
       WHERE s.school_id=$1 AND s.current_class_id=$2 AND s.is_active=true AND sp.phone IS NOT NULL`,
      [req.schoolId, classId]
    );
    phones = rows.map(r => r.phone);
  } else if (all && recipientType === 'staff') {
    const { rows } = await query(
      `SELECT u.phone FROM users u
       JOIN staff s ON s.user_id=u.id
       WHERE s.school_id=$1 AND s.is_active=true AND u.phone IS NOT NULL`,
      [req.schoolId]
    );
    phones = rows.map(r => r.phone);
  } else if (recipients?.length) {
    phones = recipients;
  }

  if (!phones.length) return res.status(400).json({ error: 'No recipients found' });
  if (!message) return res.status(400).json({ error: 'Message is required' });

  let sent = 0, failed = 0;
  const BATCH = 50;
  for (let i = 0; i < phones.length; i += BATCH) {
    const batch = phones.slice(i, i + BATCH);
    const results = await Promise.allSettled(
      batch.map(phone => smsService.send(phone, message))
    );
    results.forEach(r => r.status === 'fulfilled' ? sent++ : failed++);
  }

  // Log notification
  await query(
    `INSERT INTO notifications(school_id, type, title, message, sent_by, recipient_count)
     VALUES($1,'sms',$2,$3,$4,$5)`,
    [req.schoolId, `SMS to ${recipientType || 'custom'}`, message, req.user.id, sent]
  ).catch(() => {});

  res.json({ message: `SMS sent`, sent, failed, total: phones.length });
};

// ── POST /api/notifications/send-email ───────────────────────
const sendEmail = async (req, res) => {
  const { recipients, subject, body, recipientType, classId, all } = req.body;

  let emails = [];

  if (all && recipientType === 'parents') {
    const { rows } = await query(
      `SELECT DISTINCT sp.email FROM student_parents sp
       JOIN students s ON sp.student_id = s.id
       WHERE s.school_id=$1 AND s.is_active=true AND sp.email IS NOT NULL`,
      [req.schoolId]
    );
    emails = rows.map(r => r.email);
  } else if (classId && recipientType === 'parents') {
    const { rows } = await query(
      `SELECT DISTINCT sp.email FROM student_parents sp
       JOIN students s ON sp.student_id = s.id
       WHERE s.school_id=$1 AND s.current_class_id=$2 AND s.is_active=true AND sp.email IS NOT NULL`,
      [req.schoolId, classId]
    );
    emails = rows.map(r => r.email);
  } else if (all && recipientType === 'staff') {
    const { rows } = await query(
      `SELECT u.email FROM users u JOIN staff s ON s.user_id=u.id
       WHERE s.school_id=$1 AND s.is_active=true`,
      [req.schoolId]
    );
    emails = rows.map(r => r.email);
  } else if (recipients?.length) {
    emails = recipients;
  }

  if (!emails.length) return res.status(400).json({ error: 'No recipients found' });

  let sent = 0, failed = 0;
  const results = await Promise.allSettled(
    emails.map(email => emailService.send(email, subject, body))
  );
  results.forEach(r => r.status === 'fulfilled' ? sent++ : failed++);

  // Log
  await query(
    `INSERT INTO notifications(school_id, type, title, message, sent_by, recipient_count)
     VALUES($1,'email',$2,$3,$4,$5)`,
    [req.schoolId, subject, body, req.user.id, sent]
  ).catch(() => {});

  res.json({ sent, failed, total: emails.length });
};

// ── POST /api/notifications/broadcast ────────────────────────
const broadcast = async (req, res) => {
  const { title, message, targetRoles, targetAll } = req.body;
  // Broadcast in-app notification

  let userIds = [];
  if (targetAll) {
    const { rows } = await query(
      'SELECT id FROM users WHERE school_id=$1 AND is_active=true', [req.schoolId]
    );
    userIds = rows.map(r => r.id);
  } else if (targetRoles?.length) {
    const { rows } = await query(
      'SELECT id FROM users WHERE school_id=$1 AND is_active=true AND role=ANY($2)',
      [req.schoolId, targetRoles]
    );
    userIds = rows.map(r => r.id);
  }

  await withTransaction(async (client) => {
    for (const userId of userIds) {
      await client.query(
        `INSERT INTO notifications(school_id, recipient_id, type, title, message, sent_by)
         VALUES($1,$2,'in_app',$3,$4,$5)`,
        [req.schoolId, userId, title, message, req.user.id]
      );
    }
  });

  // Emit via Socket.IO
  const io = req.app.get('io');
  if (io) {
    io.to(`school-${req.schoolId}`).emit('notification', { title, message });
  }

  res.json({ message: `Broadcast sent to ${userIds.length} users` });
};

// ── GET /api/notifications/unread-count ──────────────────────
const getUnreadCount = async (req, res) => {
  const { rows } = await query(
    `SELECT COUNT(*) as count FROM notifications
     WHERE school_id=$1 AND recipient_id=$2 AND is_read=false`,
    [req.schoolId, req.user.id]
  );
  res.json({ count: parseInt(rows[0].count) });
};

module.exports = { getNotifications, markRead, sendSMS, sendEmail, broadcast, getUnreadCount };
