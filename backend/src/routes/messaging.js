const router = require('express').Router();
const { requireMinRole } = require('../middleware/auth');
const { query, paginatedQuery } = require('../config/database');

// Templates
router.get('/templates', async (req, res) => {
  const { rows } = await query('SELECT * FROM message_templates WHERE school_id=$1 ORDER BY category, name', [req.schoolId]);
  res.json(rows);
});
router.post('/templates', requireMinRole('teacher'), async (req, res) => {
  const { name, category, subject, body, variables, channels } = req.body;
  const { rows } = await query(
    `INSERT INTO message_templates(school_id, name, category, subject, body, variables, channels, created_by)
     VALUES($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
    [req.schoolId, name, category||'general', subject, body, variables||[], channels||[], req.user.id]
  );
  res.status(201).json(rows[0]);
});

// Scheduled messages
router.get('/scheduled', requireMinRole('teacher'), async (req, res) => {
  const { rows } = await query('SELECT * FROM scheduled_messages WHERE school_id=$1 ORDER BY scheduled_at DESC', [req.schoolId]);
  res.json(rows);
});
router.post('/schedule', requireMinRole('teacher'), async (req, res) => {
  const { templateId, subject, body, channels, recipientType, scheduledAt, recipientFilters } = req.body;
  if (!body || !scheduledAt) return res.status(400).json({ error: 'body and scheduledAt required' });
  const { rows } = await query(
    `INSERT INTO scheduled_messages(school_id, template_id, subject, body, channels, recipient_type, recipient_filters, scheduled_at, created_by)
     VALUES($1,$2,$3,$4,$5,$6,$7::jsonb,$8,$9) RETURNING *`,
    [req.schoolId, templateId, subject, body, channels||[], recipientType||'all_parents',
     JSON.stringify(recipientFilters||{}), scheduledAt, req.user.id]
  );
  res.status(201).json(rows[0]);
});
router.delete('/scheduled/:id', requireMinRole('teacher'), async (req, res) => {
  await query("UPDATE scheduled_messages SET status='cancelled' WHERE id=$1 AND school_id=$2", [req.params.id, req.schoolId]);
  res.json({ message: 'Cancelled' });
});

module.exports = router;
