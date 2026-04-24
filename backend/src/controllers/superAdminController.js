// ============================================================
// Super Admin Controller — Platform Management
// ============================================================
const { query, withTransaction } = require('../config/database');
const bcrypt = require('bcryptjs');

exports.getAllSchools = async (req, res) => {
  try {
    const { q, limit = 50, offset = 0 } = req.query;
    let sql = `SELECT s.id, s.school_code, s.name, s.short_name, s.county, s.email, s.phone,
      s.type, s.is_active, s.is_verified, s.created_at,
      (SELECT COUNT(*) FROM students WHERE school_id=s.id AND is_active=true) AS student_count,
      (SELECT COUNT(*) FROM staff WHERE school_id=s.id AND is_active=true) AS staff_count,
      (SELECT COUNT(*) FROM users WHERE school_id=s.id) AS total_users,
      (SELECT MAX(created_at) FROM users WHERE school_id=s.id) AS last_activity,
      (SELECT sub.status FROM subscriptions sub WHERE sub.school_id=s.id ORDER BY sub.created_at DESC LIMIT 1) AS subscription_status,
      (SELECT sub.plan FROM subscriptions sub WHERE sub.school_id=s.id ORDER BY sub.created_at DESC LIMIT 1) AS subscription_plan,
      (SELECT sub.end_date FROM subscriptions sub WHERE sub.school_id=s.id ORDER BY sub.created_at DESC LIMIT 1) AS sub_end_date,
      (SELECT sub.amount_paid FROM subscriptions sub WHERE sub.school_id=s.id ORDER BY sub.created_at DESC LIMIT 1) AS amount_paid
    FROM schools s WHERE 1=1`;
    const params = [];
    if (q) {
      params.push(`%${q}%`);
      sql += ` AND (s.name ILIKE $${params.length} OR s.school_code ILIKE $${params.length})`;
    }
    sql += ` ORDER BY s.created_at DESC LIMIT ${parseInt(limit)} OFFSET ${parseInt(offset)}`;
    const { rows } = await query(sql, params);
    const { rows: cnt } = await query('SELECT COUNT(*) FROM schools', []);
    res.json({ data: rows, total: parseInt(cnt[0].count) });
  } catch (e) { res.status(500).json({ error: e.message }); }
};

exports.getSchool = async (req, res) => {
  try {
    const { rows } = await query(
      `SELECT s.*, 
        (SELECT COUNT(*) FROM students WHERE school_id=s.id AND is_active=true) AS student_count,
        (SELECT COUNT(*) FROM staff WHERE school_id=s.id AND is_active=true) AS staff_count
       FROM schools s WHERE s.id=$1`, [req.params.id]);
    if (!rows.length) return res.status(404).json({ error: 'Not found' });
    res.json(rows[0]);
  } catch (e) { res.status(500).json({ error: e.message }); }
};

exports.createSchool = async (req, res) => {
  try {
    const { name, code, email, phone, address, county, schoolType = 'secondary',
            adminName, adminEmail, adminPassword } = req.body;
    if (!name || !adminEmail) return res.status(400).json({ error: 'name and adminEmail required' });
    const schoolCode = (code || name.toUpperCase().replace(/\s+/g,'').slice(0,6) + Math.floor(Math.random()*100)).toUpperCase();
    const { rows: existing } = await query('SELECT id FROM schools WHERE school_code=$1', [schoolCode]);
    if (existing.length) return res.status(400).json({ error: 'School code already exists' });
    const { rows } = await query(
      `INSERT INTO schools(school_code,name,email,phone,address,county,type,is_active,is_verified)
       VALUES($1,$2,$3,$4,$5,$6,$7::school_type,true,false) RETURNING *`,
      [schoolCode, name, email||null, phone||null, address||null, county||null, schoolType]
    );
    const school = rows[0];
    const pwd = adminPassword || `Admin@${schoolCode}2025!`;
    const hash = await bcrypt.hash(pwd, 10);
    const [firstName, ...rest] = (adminName || 'School Admin').split(' ');
    await query(
      `INSERT INTO users(school_id,first_name,last_name,email,password_hash,role,is_active,is_email_verified)
       VALUES($1,$2,$3,$4,$5,'school_admin',true,true)`,
      [school.id, firstName, rest.join(' ') || 'Admin', adminEmail, hash]
    );
    res.json({ ...school, adminEmail, tempPassword: pwd });
  } catch (e) { res.status(500).json({ error: e.message }); }
};

exports.updateSchool = async (req, res) => {
  try {
    const { name, email, phone, address, county, schoolType } = req.body;
    const { rows } = await query(
      `UPDATE schools SET name=COALESCE($1,name),email=COALESCE($2,email),
       phone=COALESCE($3,phone),address=COALESCE($4,address),
       county=COALESCE($5,county),type=COALESCE($6::school_type,type),updated_at=NOW()
       WHERE id=$7 RETURNING *`,
      [name||null, email||null, phone||null, address||null, county||null, schoolType||null, req.params.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'Not found' });
    res.json(rows[0]);
  } catch (e) { res.status(500).json({ error: e.message }); }
};

exports.deleteSchool = async (req, res) => {
  try {
    await query('DELETE FROM schools WHERE id=$1', [req.params.id]);
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
};

exports.manageSubscription = async (req, res) => {
  try {
    const { action } = req.body; // 'activate' | 'suspend' | 'trial'
    const isActive = action !== 'suspend';
    const { rows } = await query(
      'UPDATE schools SET is_active=$1, updated_at=NOW() WHERE id=$2 RETURNING *',
      [isActive, req.params.id]
    );
    res.json(rows[0]);
  } catch (e) { res.status(500).json({ error: e.message }); }
};

exports.lockSchool = async (req, res) => {
  try {
    await query('UPDATE schools SET is_active=false WHERE id=$1', [req.params.id]);
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
};

exports.unlockSchool = async (req, res) => {
  try {
    await query('UPDATE schools SET is_active=true WHERE id=$1', [req.params.id]);
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
};

exports.autoLockExpired = async (req, res) => {
  res.json({ message: 'No expiry column — manage manually via lock/unlock', locked: 0 });
};

exports.impersonateSchool = async (req, res) => {
  try {
    const { rows } = await query(
      `SELECT u.* FROM users u WHERE u.school_id=$1 AND u.role='school_admin' AND u.is_active=true LIMIT 1`,
      [req.params.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'No admin found for this school' });
    const jwt = require('jsonwebtoken');
    const token = jwt.sign(
      { userId: rows[0].id, role: rows[0].role, schoolId: req.params.id, impersonated: true },
      process.env.JWT_SECRET || 'secret', { expiresIn: '2h' }
    );
    res.json({ accessToken: token, user: rows[0] });
  } catch (e) { res.status(500).json({ error: e.message }); }
};

exports.sendBroadcast = async (req, res) => {
  try {
    const { message, subject } = req.body;
    if (!message) return res.status(400).json({ error: 'message required' });
    res.json({ success: true, sent: 0, message: 'Broadcast queued' });
  } catch (e) { res.status(500).json({ error: e.message }); }
};

exports.getPlatformStats = async (req, res) => {
  try {
    const [schoolStats, userStats, studentStats, recentSchools, subStats] = await Promise.all([
      query("SELECT COUNT(*) as total, COUNT(*) FILTER (WHERE is_active) as active, COUNT(*) FILTER (WHERE subscription_status='active') as paid FROM schools"),
      query("SELECT COUNT(*) as total FROM users WHERE role != 'super_admin'"),
      query('SELECT COUNT(*) as total FROM students WHERE is_active=true'),
      query(`SELECT s.id, s.name, s.school_code, s.county, s.is_active, s.subscription_status as sub_status, s.created_at,
               (SELECT COUNT(*) FROM students st WHERE st.school_id=s.id AND st.is_active=true) AS student_count,
               (SELECT COUNT(*) FROM staff sf WHERE sf.school_id=s.id) AS staff_count
             FROM schools s ORDER BY s.created_at DESC LIMIT 10`),
      query(`SELECT subscription_status as status, COUNT(*) as count FROM schools GROUP BY subscription_status`),
    ]);
    res.json({
      schools: {
        total: parseInt(schoolStats.rows[0].total),
        active: parseInt(schoolStats.rows[0].active),
        paid: parseInt(schoolStats.rows[0].paid),
      },
      students: { total: parseInt(studentStats.rows[0].total) },
      users: { total: parseInt(userStats.rows[0].total) },
      revenue: { total: 0, transactions: 0 },
      recentSchools: recentSchools.rows,
      subscriptions: subStats.rows,
      // legacy fields for backward compat
      totalSchools: parseInt(schoolStats.rows[0].total),
      activeSchools: parseInt(schoolStats.rows[0].active),
      totalUsers: parseInt(userStats.rows[0].total),
      totalStudents: parseInt(studentStats.rows[0].total),
    });
  } catch (e) { res.status(500).json({ error: e.message }); }
};

exports.resetAdminPassword = async (req, res) => {
  try {
    const bcrypt = require('bcryptjs');
    const newPwd = 'Admin@' + Date.now().toString().slice(-6) + '!';
    const hash = await bcrypt.hash(newPwd, 10);
    const { rows } = await query(
      `UPDATE users SET password_hash=$1, must_change_password=true
       WHERE school_id=$2 AND role='school_admin' AND is_active=true
       RETURNING email`,
      [hash, req.params.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'No admin found' });
    res.json({ message: 'Password reset', email: rows[0].email, tempPassword: newPwd });
  } catch (e) { res.status(500).json({ error: e.message }); }
};

exports.suspendSchool = async (req, res) => {
  try {
    await query('UPDATE schools SET is_active=false WHERE id=$1', [req.params.id]);
    res.json({ message: 'School suspended' });
  } catch(e) { res.status(500).json({ error: e.message }); }
};

exports.unsuspendSchool = async (req, res) => {
  try {
    await query('UPDATE schools SET is_active=true WHERE id=$1', [req.params.id]);
    res.json({ message: 'School activated' });
  } catch(e) { res.status(500).json({ error: e.message }); }
};
