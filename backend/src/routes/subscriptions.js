const router = require('express').Router();
const c = require('../controllers/subscriptionsController');
const { authMiddleware, requireMinRole, requireSuperAdmin } = require('../middleware/auth');
const { tenantMiddleware } = require('../middleware/tenant');
const auth = [authMiddleware, tenantMiddleware];
const admin = [authMiddleware, tenantMiddleware, requireMinRole('principal')];

// Public — no auth needed to see plans
router.get('/plans', c.getPlans);

// School routes
router.get('/my',            ...auth,  c.getMySubscription);
router.post('/choose',       ...admin, c.choosePlan);
router.post('/payment',      ...admin, c.recordPayment);
router.get('/payments',      ...auth,  c.getPaymentHistory);

// Super admin routes
router.get('/all',              authMiddleware, requireSuperAdmin, c.getAllSubscriptions);
router.put('/:id',              authMiddleware, requireSuperAdmin, c.updateSubscription);

module.exports = router;
