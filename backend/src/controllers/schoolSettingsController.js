// ============================================================
// schoolSettingsController — SMS, M-Pesa, email, system config
// ============================================================
const { query } = require('../config/database');

exports.getAll = async (req, res) => {
  try {
    const { rows } = await query(
      'SELECT * FROM school_settings WHERE school_id=$1', [req.schoolId]);
    // Return as key-value map
    const settings = {};
    rows.forEach(r => { settings[r.setting_key] = r.setting_value; });
    // Mask secrets
    ['mpesa_consumer_secret','smtp_password','at_api_key'].forEach(k => {
      if (settings[k]) settings[k] = '••••••••';
    });
    res.json({ data: settings, keys: rows.map(r=>r.setting_key) });
  } catch (e) { res.status(500).json({ error: e.message }); }
};

exports.getOne = async (req, res) => {
  try {
    const { rows } = await query(
      'SELECT * FROM school_settings WHERE school_id=$1 AND setting_key=$2',
      [req.schoolId, req.params.id]);
    if (!rows.length) return res.status(404).json({ error: 'Setting not found' });
    res.json(rows[0]);
  } catch (e) { res.status(500).json({ error: e.message }); }
};

exports.create = async (req, res) => {
  try {
    const { key, value, isSecret } = req.body;
    if (!key) return res.status(400).json({ error: 'key required' });
    await query(
      `INSERT INTO school_settings(school_id, setting_key, setting_value, is_secret)
       VALUES($1,$2,$3,$4)
       ON CONFLICT(school_id, setting_key) DO UPDATE SET setting_value=$3, updated_at=NOW()`,
      [req.schoolId, key, value, !!isSecret]);
    res.json({ message: 'Setting saved', key });
  } catch (e) { res.status(500).json({ error: e.message }); }
};

// Bulk upsert — POST body: { settings: { key: value, ... } }
exports.bulkUpdate = async (req, res) => {
  try {
    const { settings } = req.body;
    if (!settings || typeof settings !== 'object') return res.status(400).json({ error: 'settings object required' });
    const SECRET_KEYS = ['mpesa_consumer_secret','smtp_password','at_api_key','jwt_secret'];
    for (const [key, value] of Object.entries(settings)) {
      if (value === '••••••••') continue; // skip masked values
      await query(
        `INSERT INTO school_settings(school_id, setting_key, setting_value, is_secret)
         VALUES($1,$2,$3,$4)
         ON CONFLICT(school_id, setting_key) DO UPDATE SET setting_value=$3, updated_at=NOW()`,
        [req.schoolId, key, value, SECRET_KEYS.includes(key)]);
    }
    res.json({ message: 'Settings updated', count: Object.keys(settings).length });
  } catch (e) { res.status(500).json({ error: e.message }); }
};

exports.update = async (req, res) => {
  try {
    const { value } = req.body;
    const { rows } = await query(
      `UPDATE school_settings SET setting_value=$1, updated_at=NOW()
       WHERE school_id=$2 AND setting_key=$3 RETURNING setting_key`,
      [value, req.schoolId, req.params.id]);
    if (!rows.length) return res.status(404).json({ error: 'Setting not found' });
    res.json({ message: 'Updated', key: rows[0].setting_key });
  } catch (e) { res.status(500).json({ error: e.message }); }
};

exports.remove = async (req, res) => {
  try {
    await query('DELETE FROM school_settings WHERE school_id=$1 AND setting_key=$2',
      [req.schoolId, req.params.id]);
    res.json({ message: 'Deleted' });
  } catch (e) { res.status(500).json({ error: e.message }); }
};
