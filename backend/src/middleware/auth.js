// ============================================================
// Auth Middleware — JWT & RBAC
// ============================================================
const jwt = require('jsonwebtoken');
const { query } = require('../config/database');
const { session } = require('../config/redis');
const logger = require('../config/logger');

// Role hierarchy for permission checks
const ROLE_HIERARCHY = {
  super_admin: 10,
  school_admin: 9,
  principal: 8,
  deputy_principal: 7,
  hod: 6,
  bursar: 5,
  teacher: 4,
  librarian: 3,
  parent: 2,
  student: 1,
  alumni: 1,
};

// ── Verify JWT Token ──────────────────────────────────────────
const authMiddleware = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No authentication token provided' });
    }

    const token = authHeader.split(' ')[1];

    // Check blacklist
    const blacklisted = await session.isBlacklisted(token).catch(() => false);
    if (blacklisted) {
      return res.status(401).json({ error: 'Token has been revoked' });
    }

    // Verify token
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (err) {
      if (err.name === 'TokenExpiredError') {
        return res.status(401).json({ error: 'Token expired', code: 'TOKEN_EXPIRED' });
      }
      return res.status(401).json({ error: 'Invalid token' });
    }

    // Fetch user from DB
    const { rows } = await query(
      `SELECT u.*, s.name as school_name, s.school_code, s.is_active as school_active
       FROM users u
       LEFT JOIN schools s ON u.school_id = s.id
       WHERE u.id = $1 AND u.is_active = true`,
      [decoded.userId]
    );

    if (rows.length === 0) {
      return res.status(401).json({ error: 'User not found or inactive' });
    }

    const user = rows[0];

    // Check if account is locked
    if (user.locked_until && new Date(user.locked_until) > new Date()) {
      return res.status(403).json({ error: 'Account temporarily locked due to failed login attempts' });
    }

    // ── School suspension check ───────────────────────────────
    if (user.school_id && user.role !== 'super_admin' && user.school_active === false) {
      return res.status(403).json({
        error: 'School account suspended. Please renew your subscription to continue.',
        code: 'SCHOOL_SUSPENDED',
      });
    }

    // Attach user to request
    req.user = {
      id: user.id,
      email: user.email,
      role: user.role,
      schoolId: user.school_id,
      schoolCode: user.school_code,
      schoolName: user.school_name,
      firstName: user.first_name,
      lastName: user.last_name,
      isSuperAdmin: user.role === 'super_admin',
      teacherAssignments: [],
    };

    // For teachers: fetch their class/subject assignments for marks restriction
    if (['teacher','class_teacher','hod','dean_of_studies'].includes(user.role) && user.school_id) {
      const { rows: classRows } = await query(
        `SELECT DISTINCT cs.class_id, cs.subject_id FROM class_subjects cs
         WHERE cs.teacher_id = $1 AND cs.school_id = $2`,
        [user.id, user.school_id]
      ).catch(() => ({ rows: [] }));
      req.user.teacherAssignments = classRows;
      req.user.teacherClassIds = [...new Set(classRows.map(r => r.class_id))];
    }

    next();
  } catch (err) {
    logger.error('Auth middleware error:', err);
    res.status(500).json({ error: 'Authentication error' });
  }
};

// ── Role-Based Access Control ─────────────────────────────────
const requireRole = (...roles) => {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
    if (req.user.isSuperAdmin) return next(); // Super admin bypasses all
    if (roles.includes(req.user.role)) return next();
    return res.status(403).json({
      error: `Access denied. Required roles: ${roles.join(', ')}`,
    });
  };
};

// ── Minimum Role Level ────────────────────────────────────────
const requireMinRole = (minRole) => {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
    if (req.user.isSuperAdmin) return next();
    const userLevel = ROLE_HIERARCHY[req.user.role] || 0;
    const minLevel = ROLE_HIERARCHY[minRole] || 0;
    if (userLevel >= minLevel) return next();
    return res.status(403).json({ error: 'Insufficient permissions' });
  };
};

// ── Super Admin Only ──────────────────────────────────────────
const requireSuperAdmin = (req, res, next) => {
  if (!req.user?.isSuperAdmin) {
    return res.status(403).json({ error: 'Super admin access required' });
  }
  next();
};

// ── School Ownership Check ────────────────────────────────────
const requireSchoolAccess = (req, res, next) => {
  if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
  if (req.user.isSuperAdmin) return next();

  const schoolId = req.params.schoolId || req.query.schoolId || req.body.schoolId || req.user.schoolId;
  if (req.user.schoolId && req.user.schoolId !== schoolId) {
    return res.status(403).json({ error: 'Access denied to this school' });
  }
  next();
};

// ── Optional Auth (for public + private routes) ───────────────
const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const { rows } = await query('SELECT * FROM users WHERE id=$1 AND is_active=true', [decoded.userId]);
      if (rows.length > 0) req.user = rows[0];
    }
  } catch {}
  next();
};

module.exports = {
  authMiddleware,
  requireRole,
  requireMinRole,
  requireSuperAdmin,
  requireSchoolAccess,
  optionalAuth,
  ROLE_HIERARCHY,
};
