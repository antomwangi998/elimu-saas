// ============================================================
// Multi-Tenant Middleware — School Isolation
// ============================================================
const { query } = require('../config/database');
const { cache } = require('../config/redis');
const logger = require('../config/logger');

const tenantMiddleware = async (req, res, next) => {
  try {
    if (req.user?.isSuperAdmin) return next();

    const schoolId = req.user?.schoolId;
    if (!schoolId) {
      return res.status(403).json({ error: 'No school associated with this account' });
    }

    // Cache school info
    const cacheKey = `school:${schoolId}`;
    let school = await cache.get(cacheKey);

    if (!school) {
      const { rows } = await query(
        'SELECT id, school_code, name, is_active FROM schools WHERE id = $1',
        [schoolId]
      );
      if (rows.length === 0) {
        return res.status(404).json({ error: 'School not found' });
      }
      school = rows[0];
      await cache.set(cacheKey, school, 300);
    }

    if (!school.is_active) {
      return res.status(403).json({ 
        error: 'SCHOOL_SUSPENDED',
        message: 'Your school subscription has been suspended. Please renew to continue.',
        code: 'SUBSCRIPTION_REQUIRED',
        action: 'renew_subscription'
      });
    }

    req.schoolId = schoolId;
    req.school = school;
    req.subscription = null;

    next();
  } catch (err) {
    logger.error('Tenant middleware error:', err);
    res.status(500).json({ error: 'Tenant resolution error' });
  }
};

// ── Helper to add school_id to all queries ────────────────────
const withSchoolId = (req, params = {}) => ({
  ...params,
  school_id: req.schoolId || req.user?.schoolId,
});

module.exports = { tenantMiddleware, withSchoolId };
