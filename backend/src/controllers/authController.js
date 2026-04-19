// ============================================================
// Auth Controller — Login, Register, Refresh, Reset
// ============================================================
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const { query, withTransaction } = require('../config/database');
const { session, cache } = require('../config/redis');
const { sendEmail } = require('../services/emailService');
const logger = require('../config/logger');

// ── Generate Tokens ───────────────────────────────────────────
const generateTokens = (userId, role, schoolId) => {
  const accessToken = jwt.sign(
    { userId, role, schoolId },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
  const refreshToken = jwt.sign(
    { userId, type: 'refresh' },
    process.env.JWT_REFRESH_SECRET,
    { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '30d' }
  );
  return { accessToken, refreshToken };
};

// ── POST /api/auth/login ──────────────────────────────────────
const login = async (req, res) => {
  const { email, password, schoolCode } = req.body;

  const { tscNumber, identifier } = req.body;
  if (!email && !tscNumber && !identifier) {
    return res.status(400).json({ error: 'Email or TSC number is required' });
  }
  if (!password) {
    return res.status(400).json({ error: 'Password is required' });
  }

  // Support login by email OR TSC number
  const loginIdentifier = email || req.body.tscNumber || req.body.identifier;
  if (!loginIdentifier) {
    return res.status(400).json({ error: 'Email or TSC number is required' });
  }

  let userQuery = `
    SELECT u.*, s.name as school_name, s.school_code, s.is_active as school_active,
           s.logo_url as school_logo
    FROM users u
    LEFT JOIN schools s ON u.school_id = s.id
    WHERE (LOWER(u.email) = LOWER($1) OR u.tsc_number = $1) AND u.is_active = true
  `;
  const params = [loginIdentifier];

  if (schoolCode) {
    userQuery += ' AND s.school_code = $2';
    params.push(schoolCode.toUpperCase());
  }

  const { rows } = await query(userQuery, params);

  if (rows.length === 0) {
    return res.status(401).json({ error: 'Invalid email or password' });
  }

  const user = rows[0];

  // Check account lock
  if (user.locked_until && new Date(user.locked_until) > new Date()) {
    const remaining = Math.ceil((new Date(user.locked_until) - new Date()) / 60000);
    return res.status(403).json({
      error: `Account locked. Try again in ${remaining} minutes`,
    });
  }

  // Verify password
  const isValid = await bcrypt.compare(password, user.password_hash);
  if (!isValid) {
    const attempts = (user.failed_login_attempts || 0) + 1;
    const lockUpdate = attempts >= 5
      ? ', locked_until = NOW() + INTERVAL \'30 minutes\''
      : '';
    await query(
      `UPDATE users SET failed_login_attempts = $1 ${lockUpdate} WHERE id = $2`,
      [attempts, user.id]
    );
    await query(`INSERT INTO login_history(user_id, school_id, ip_address, user_agent, status) VALUES($1,$2,$3,$4,'failed')`, [user.id, user.school_id, req.ip, req.headers['user-agent']]).catch(() => {});
    return res.status(401).json({
      error: attempts >= 5
        ? 'Too many failed attempts. Account locked for 30 minutes.'
        : 'Invalid email or password',
    });
  }

  // Reset failed attempts & update last login
  await query(
    'UPDATE users SET failed_login_attempts=0, locked_until=NULL, last_login=NOW(), last_login_ip=$1 WHERE id=$2',
    [req.ip, user.id]
  );

  const { accessToken, refreshToken } = generateTokens(user.id, user.role, user.school_id);

  // Store refresh token hash
  const rtHash = await bcrypt.hash(refreshToken, 8);
  await query(
    'INSERT INTO refresh_tokens(user_id, token_hash, expires_at, device_info, ip_address) VALUES($1,$2,NOW()+INTERVAL\'30 days\',$3,$4)',
    [user.id, rtHash, req.headers['user-agent'], req.ip]
  );

  // Audit log + login history
  await query(
    'INSERT INTO audit_logs(school_id, user_id, action, entity_type, ip_address) VALUES($1,$2,$3,$4,$5)',
    [user.school_id, user.id, 'LOGIN', 'users', req.ip]
  ).catch(() => {});
  await query(
    `INSERT INTO login_history(user_id, school_id, ip_address, user_agent, status)
     VALUES($1,$2,$3,$4,'success')`,
    [user.id, user.school_id, req.ip, req.headers['user-agent']]
  ).catch(() => {});

  res.json({
    accessToken,
    refreshToken,
    user: {
      id: user.id,
      email: user.email,
      role: user.role,
      firstName: user.first_name,
      lastName: user.last_name,
      photo: user.photo_url,
      schoolId: user.school_id,
      schoolName: user.school_name,
      schoolCode: user.school_code,
      schoolLogo: user.school_logo,
      mustChangePassword: user.must_change_password,
      preferences: user.preferences,
    },
  });
};

// ── POST /api/auth/refresh ────────────────────────────────────
const refresh = async (req, res) => {
  const { refreshToken } = req.body;
  if (!refreshToken) return res.status(400).json({ error: 'Refresh token required' });

  let decoded;
  try {
    decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
  } catch {
    return res.status(401).json({ error: 'Invalid refresh token' });
  }

  const { rows: tokens } = await query(
    'SELECT * FROM refresh_tokens WHERE user_id=$1 AND expires_at > NOW()',
    [decoded.userId]
  );

  let validToken = null;
  for (const t of tokens) {
    if (await bcrypt.compare(refreshToken, t.token_hash)) { validToken = t; break; }
  }

  if (!validToken) return res.status(401).json({ error: 'Refresh token not found or expired' });

  const { rows } = await query('SELECT * FROM users WHERE id=$1 AND is_active=true', [decoded.userId]);
  if (rows.length === 0) return res.status(401).json({ error: 'User not found' });

  const user = rows[0];
  const { accessToken, refreshToken: newRefreshToken } = generateTokens(user.id, user.role, user.school_id);

  // Rotate refresh token
  await query('DELETE FROM refresh_tokens WHERE id=$1', [validToken.id]);
  const newHash = await bcrypt.hash(newRefreshToken, 8);
  await query(
    'INSERT INTO refresh_tokens(user_id, token_hash, expires_at) VALUES($1,$2,NOW()+INTERVAL\'30 days\')',
    [user.id, newHash]
  );

  res.json({ accessToken, refreshToken: newRefreshToken });
};

// ── POST /api/auth/logout ─────────────────────────────────────
const logout = async (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (token) {
    await session.blacklist(token, 604800);
    const decoded = jwt.decode(token);
    if (decoded?.userId) {
      await query('DELETE FROM refresh_tokens WHERE user_id=$1', [decoded.userId]).catch(() => {});
    }
  }
  res.json({ message: 'Logged out successfully' });
};

// ── POST /api/auth/forgot-password ───────────────────────────
const forgotPassword = async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: 'Email is required' });

  const { rows } = await query('SELECT id, first_name FROM users WHERE email=$1', [email]);
  // Always return success to prevent email enumeration
  if (rows.length === 0) return res.json({ message: 'If that email exists, a reset link has been sent' });

  const user = rows[0];
  const resetToken = uuidv4();
  const resetExpiry = new Date(Date.now() + 3600000); // 1 hour

  await cache.set(`pwd_reset:${resetToken}`, { userId: user.id }, 3600);

  const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;
  await sendEmail({
    to: email,
    subject: 'Reset Your ElimuSaaS Password',
    html: `
      <div style="font-family:sans-serif;max-width:600px;margin:auto;padding:32px">
        <h2>Password Reset Request</h2>
        <p>Hi ${user.first_name},</p>
        <p>You requested to reset your ElimuSaaS password. Click the link below:</p>
        <a href="${resetUrl}" style="background:#3b82f6;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;display:inline-block;margin:16px 0">Reset Password</a>
        <p>This link expires in 1 hour. If you didn't request this, ignore this email.</p>
        <p style="color:#888;font-size:12px">ElimuSaaS — Enterprise School Management</p>
      </div>
    `,
  }).catch(logger.warn);

  res.json({ message: 'If that email exists, a reset link has been sent' });
};

// ── POST /api/auth/reset-password ────────────────────────────
const resetPassword = async (req, res) => {
  const { token, password } = req.body;
  if (!token || !password) return res.status(400).json({ error: 'Token and password are required' });
  if (password.length < 8) return res.status(400).json({ error: 'Password must be at least 8 characters' });

  const data = await cache.get(`pwd_reset:${token}`);
  if (!data) return res.status(400).json({ error: 'Invalid or expired reset token' });

  const hash = await bcrypt.hash(password, parseInt(process.env.BCRYPT_ROUNDS) || 12);
  await query(
    'UPDATE users SET password_hash=$1, must_change_password=false, password_changed_at=NOW() WHERE id=$2',
    [hash, data.userId]
  );

  await cache.del(`pwd_reset:${token}`);
  await query('DELETE FROM refresh_tokens WHERE user_id=$1', [data.userId]);

  res.json({ message: 'Password reset successfully. Please log in.' });
};

// ── PUT /api/auth/change-password ─────────────────────────────
const changePassword = async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  if (!currentPassword || !newPassword) return res.status(400).json({ error: 'Both passwords required' });
  if (newPassword.length < 8) return res.status(400).json({ error: 'New password must be at least 8 characters' });

  const { rows } = await query('SELECT password_hash FROM users WHERE id=$1', [req.user.id]);
  const isValid = await bcrypt.compare(currentPassword, rows[0].password_hash);
  if (!isValid) return res.status(400).json({ error: 'Current password is incorrect' });

  const hash = await bcrypt.hash(newPassword, parseInt(process.env.BCRYPT_ROUNDS) || 12);
  await query(
    'UPDATE users SET password_hash=$1, must_change_password=false, password_changed_at=NOW() WHERE id=$2',
    [hash, req.user.id]
  );

  res.json({ message: 'Password changed successfully' });
};

// ── GET /api/auth/me ──────────────────────────────────────────
const getMe = async (req, res) => {
  const { rows } = await query(
    `SELECT u.id, u.email, u.role, u.first_name, u.last_name, u.phone, u.photo_url,
            u.preferences, u.must_change_password, u.school_id,
            s.name as school_name, s.school_code, s.logo_url as school_logo,
            s.is_active as school_active
     FROM users u
     LEFT JOIN schools s ON u.school_id = s.id
     WHERE u.id = $1`,
    [req.user.id]
  );
  if (rows.length === 0) return res.status(404).json({ error: 'User not found' });

  const u = rows[0];
  res.json({
    id: u.id, email: u.email, role: u.role,
    firstName: u.first_name, lastName: u.last_name,
    phone: u.phone, photo: u.photo_url,
    preferences: u.preferences,
    mustChangePassword: u.must_change_password,
    school: {
      id: u.school_id, name: u.school_name,
      code: u.school_code, logo: u.school_logo,
      isActive: u.school_active,
    },
  });
};


const adminResetPassword = async (req, res) => {
  try {
    const { userId, newPassword } = req.body;
    if (!userId || !newPassword) return res.status(400).json({ error: 'userId and newPassword required' });
    const callerRole = req.user.role;
    const callerSchoolId = req.user.schoolId;
    if (!['school_admin','principal','deputy_principal','super_admin'].includes(callerRole)) {
      return res.status(403).json({ error: 'Not authorized to reset passwords' });
    }
    const { rows } = await query('SELECT id, role, school_id FROM users WHERE id=$1 AND is_active=true', [userId]);
    if (!rows.length) return res.status(404).json({ error: 'User not found' });
    const target = rows[0];
    if (callerRole !== 'super_admin' && target.school_id !== callerSchoolId) {
      return res.status(403).json({ error: 'Cannot reset passwords for users of another school' });
    }
    if (target.role === 'super_admin') return res.status(403).json({ error: 'Cannot reset super admin password' });
    const bcrypt = require('bcryptjs');
    const hash = await bcrypt.hash(newPassword, 10);
    await query('UPDATE users SET password_hash=$1, must_change_password=true WHERE id=$2', [hash, userId]);
    res.json({ success: true, message: 'Password reset successfully' });
  } catch (e) { res.status(500).json({ error: e.message }); }
};

module.exports = { login, refresh, logout, forgotPassword, resetPassword, changePassword, getMe, adminResetPassword };
