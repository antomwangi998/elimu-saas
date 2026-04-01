// ============================================================
// Communication Controller — SMS · Email · In-App · Push
// Bulk Messaging · Threads · Notifications · SMS Templates
// ============================================================
const { query, withTransaction } = require('../config/database');
const smsService   = require('../services/smsService');
const emailService = require('../services/emailService');

const sendMessage = async (req, res) => {
  try {
    const { subject, body, type, recipientType, classId, recipients, scheduledAt } = req.body;
    if (!body) return res.status(400).json({ error: 'body required' });

    const { rows: msg } = await query(`
      INSERT INTO messages(school_id,sender_id,subject,body,type,recipient_type,class_id,scheduled_at)
      VALUES($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
      [req.schoolId, req.user.id, subject, body, type||'in_app', recipientType||'individual', classId||null, scheduledAt||null]);

    let phoneNumbers = [], emails = [], sentCount = 0, failedCount = 0;

    if (!scheduledAt) {
      if (recipientType === 'class' && classId) {
        const { rows } = await query(`SELECT sp.phone, sp.email FROM student_parents sp
          JOIN students s ON sp.student_id=s.id WHERE s.current_class_id=$1 AND s.school_id=$2
          AND s.is_active=true AND sp.is_primary=true`, [classId, req.schoolId]);
        phoneNumbers = rows.filter(p => p.phone).map(p => p.phone);
        emails = rows.filter(p => p.email).map(p => p.email);
      } else if (recipientType === 'all_parents') {
        const { rows } = await query(`SELECT DISTINCT sp.phone, sp.email FROM student_parents sp
          JOIN students s ON sp.student_id=s.id WHERE s.school_id=$1 AND s.is_active=true AND sp.is_primary=true`,
          [req.schoolId]);
        phoneNumbers = rows.filter(p => p.phone).map(p => p.phone);
        emails = rows.filter(p => p.email).map(p => p.email);
      } else if (recipientType === 'all_staff') {
        const { rows } = await query(`SELECT u.phone, u.email FROM users u WHERE u.school_id=$1 AND u.is_active=true AND u.role != 'parent' AND u.role != 'student'`, [req.schoolId]);
        phoneNumbers = rows.filter(r => r.phone).map(r => r.phone);
        emails = rows.filter(r => r.email).map(r => r.email);
      } else if (recipientType === 'all_students') {
        const { rows } = await query(`SELECT sp.phone, sp.email FROM student_parents sp
          JOIN students s ON sp.student_id=s.id WHERE s.school_id=$1 AND s.is_active=true AND sp.is_primary=true`,
          [req.schoolId]);
        phoneNumbers = rows.filter(p => p.phone).map(p => p.phone);
      } else if (recipients?.length) {
        phoneNumbers = recipients.filter(r => r.phone).map(r => r.phone);
        emails = recipients.filter(r => r.email).map(r => r.email);
      }

      if ((type === 'sms' || type === 'both') && phoneNumbers.length) {
        try { await smsService.sendSms({ to: phoneNumbers, message: body }); sentCount += phoneNumbers.length; }
        catch { failedCount += phoneNumbers.length; }
      }
      if ((type === 'email' || type === 'both') && emails.length) {
        const results = await emailService.sendBulkEmails(
          emails.map(e => ({ to:e, subject: subject||'School Notice', html: `<p>${body}</p>` }))
        ).catch(()=>[]);
        sentCount += results.filter(r=>r.status==='sent').length;
        failedCount += results.filter(r=>r.status==='failed').length;
      }
      await query('UPDATE messages SET sent_at=NOW(), sent_count=$2, failed_count=$3 WHERE id=$1',
        [msg[0].id, sentCount, failedCount]);
    }
    res.status(201).json({ id: msg[0].id, sentCount, failedCount, message: 'Message processed' });
  } catch (e) { res.status(500).json({ error: e.message }); }
};

const getMessages = async (req, res) => {
  try {
    const { rows } = await query(`
      SELECT m.*, u.first_name || ' ' || u.last_name as sender_name
      FROM messages m LEFT JOIN users u ON u.id = m.sender_id
      WHERE m.school_id=$1 ORDER BY m.created_at DESC LIMIT 50`, [req.schoolId]);
    res.json(rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
};

const getNotifications = async (req, res) => {
  try {
    const { rows } = await query(`
      SELECT * FROM notifications WHERE school_id=$1 AND (recipient_id=$2 OR recipient_type IN ('all','all_staff','all_parents'))
      ORDER BY created_at DESC LIMIT 50`, [req.schoolId, req.user.id]);
    res.json(rows);
  } catch (e) { res.json([]); }
};

const markNotificationRead = async (req, res) => {
  try {
    await query('UPDATE notifications SET is_read=true, read_at=NOW() WHERE id=$1 AND recipient_id=$2',
      [req.params.id, req.user.id]);
    res.json({ success: true });
  } catch (e) { res.json({ success: true }); }
};

const sendAnnouncement = async (req, res) => {
  try {
    const { title, body, recipientType } = req.body;
    if (!title || !body) return res.status(400).json({ error: 'title and body required' });
    const { rows } = await query(`
      INSERT INTO notifications(school_id, title, body, type, recipient_type, recipient_id)
      VALUES($1,$2,$3,'announcement',$4,$5) RETURNING *`,
      [req.schoolId, title, body, recipientType||'all', null]);
    res.status(201).json(rows[0]);
  } catch (e) { res.status(500).json({ error: e.message }); }
};

module.exports = { sendMessage, getMessages, getNotifications, markNotificationRead, sendAnnouncement };
