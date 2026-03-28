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
      return res.status(403).json({ error: 'School account is inactive. Please contact support.' });
    }

    // Check subscription status
    const subCacheKey = `subscription:${schoolId}`;
    let subscription = await cache.get(subCacheKey);

    if (!subscription) {
      const { rows } = await query(
        `SELECT id, status, end_date, grace_end_date
         FROM subscriptions
         WHERE school_id = $1 AND year = EXTRACT(YEAR FROM NOW())
         ORDER BY created_at DESC LIMIT 1`,
        [schoolId]
      );
      subscription = rows[0] || null;
      await cache.set(subCacheKey, subscription, 60);
    }

    if (subscription) {
      const now = new Date();

      // Full lock after grace period
      if (
        subscription.status === 'suspended' ||
        (subscription.status === 'grace' && new Date(subscription.grace_end_date) < now)
      ) {
        // Allow bursar and admin to access finance/subscription pages
        const allowedPaths = ['/api/payments', '/api/subscriptions', '/api/dashboard'];
        const isAllowedRole = ['bursar', 'school_admin', 'principal'].includes(req.user?.role);
        const isAllowedPath = allowedPaths.some(p => req.path.startsWith(p));

        if (!isAllowedRole || !isAllowedPath) {
          return res.status(402).json({
            error: 'Subscription expired. Please renew to continue.',
            code: 'SUBSCRIPTION_EXPIRED',
            subscriptionStatus: subscription.status,
          });
        }
      }

      // Soft lock (grace period warning)
      if (subscription.status === 'grace') {
        res.set('X-Subscription-Warning', 'grace-period');
        res.set('X-Grace-End', subscription.grace_end_date);
      }
    }

    req.schoolId = schoolId;
    req.school = school;
    req.subscription = subscription;

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
