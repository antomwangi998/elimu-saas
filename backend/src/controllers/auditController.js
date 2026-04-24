// ============================================================
// auditController — Audit log: who did what, when
// ============================================================
const { query } = require('../config/database');

exports.getAll = async (req, res) => {
  try {
    const { limit = 50, offset = 0, action, userId, entityType, from, to } = req.query;
    let sql = `
      SELECT al.*, u.first_name||' '||u.last_name as user_name, u.role, u.email
      FROM audit_logs al
      LEFT JOIN users u ON u.id = al.user_id
      WHERE al.school_id = $1`;
    const params = [req.schoolId];
    let i = 2;
    if (action)     { sql += ` AND al.action ILIKE $${i++}`;       params.push(`%${action}%`); }
    if (userId)     { sql += ` AND al.user_id = $${i++}`;          params.push(userId); }
    if (entityType) { sql += ` AND al.entity_type = $${i++}`;      params.push(entityType); }
    if (from)       { sql += ` AND al.created_at >= $${i++}`;      params.push(from); }
    if (to)         { sql += ` AND al.created_at <= $${i++}`;      params.push(to + 'T23:59:59'); }
    sql += ` ORDER BY al.created_at DESC LIMIT $${i++} OFFSET $${i}`;
    params.push(parseInt(limit), parseInt(offset));
    const { rows } = await query(sql, params);
    const { rows: cnt } = await query(
      'SELECT COUNT(*) FROM audit_logs WHERE school_id=$1', [req.schoolId]);
    res.json({ data: rows, total: parseInt(cnt[0].count) });
  } catch (e) { res.status(500).json({ error: e.message }); }
};

exports.getOne = async (req, res) => {
  try {
    const { rows } = await query(
      `SELECT al.*, u.first_name||' '||u.last_name as user_name, u.email, u.role
       FROM audit_logs al LEFT JOIN users u ON u.id=al.user_id
       WHERE al.id=$1 AND al.school_id=$2`, [req.params.id, req.schoolId]);
    if (!rows.length) return res.status(404).json({ error: 'Not found' });
    res.json(rows[0]);
  } catch (e) { res.status(500).json({ error: e.message }); }
};

// POST — log an action (called internally or from middleware)
exports.create = async (req, res) => {
  try {
    const { action, entityType, entityId, oldData, newData } = req.body;
    if (!action) return res.status(400).json({ error: 'action required' });
    await query(
      `INSERT INTO audit_logs(school_id,user_id,action,entity_type,entity_id,old_data,new_data,ip_address,user_agent)
       VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
      [req.schoolId, req.user.id, action, entityType||null, entityId||null,
       oldData ? JSON.stringify(oldData) : null,
       newData ? JSON.stringify(newData) : null,
       req.ip||null, req.headers['user-agent']?.slice(0,200)||null]);
    res.status(201).json({ message: 'Logged' });
  } catch (e) { res.status(500).json({ error: e.message }); }
};

// Summary stats for dashboard
exports.getSummary = async (req, res) => {
  try {
    const { rows: recent } = await query(
      `SELECT al.action, al.entity_type, al.created_at,
              u.first_name||' '||u.last_name as user_name, u.role
       FROM audit_logs al LEFT JOIN users u ON u.id=al.user_id
       WHERE al.school_id=$1 AND al.created_at >= NOW()-INTERVAL '7 days'
       ORDER BY al.created_at DESC LIMIT 20`, [req.schoolId]);
    const { rows: byAction } = await query(
      `SELECT action, COUNT(*) as count FROM audit_logs
       WHERE school_id=$1 AND created_at >= NOW()-INTERVAL '30 days'
       GROUP BY action ORDER BY count DESC LIMIT 10`, [req.schoolId]);
    const { rows: byUser } = await query(
      `SELECT u.first_name||' '||u.last_name as name, u.role, COUNT(*) as count
       FROM audit_logs al JOIN users u ON u.id=al.user_id
       WHERE al.school_id=$1 AND al.created_at >= NOW()-INTERVAL '30 days'
       GROUP BY u.id, u.first_name, u.last_name, u.role
       ORDER BY count DESC LIMIT 5`, [req.schoolId]);
    res.json({ recent, byAction, byUser });
  } catch (e) { res.status(500).json({ error: e.message }); }
};

exports.update = async (req, res) => res.status(405).json({ error: 'Audit logs are immutable' });
exports.remove = async (req, res) => res.status(405).json({ error: 'Audit logs are immutable' });
