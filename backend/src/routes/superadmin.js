const router = require('express').Router();
const c = require('../controllers/superAdminController');
const { requireSuperAdmin } = require('../middleware/auth');
router.get('/schools', requireSuperAdmin, c.getAllSchools);
router.get('/schools/:id', requireSuperAdmin, c.getSchool);
router.post('/schools', requireSuperAdmin, c.createSchool);
router.put('/schools/:id', requireSuperAdmin, c.updateSchool);
router.delete('/schools/:id', requireSuperAdmin, c.deleteSchool);
router.post('/schools/:id/subscription', requireSuperAdmin, c.manageSubscription);
router.post('/schools/:id/lock', requireSuperAdmin, c.lockSchool);
router.post('/schools/:id/unlock', requireSuperAdmin, c.unlockSchool);
router.post('/auto-lock-expired', requireSuperAdmin, c.autoLockExpired);
router.post('/schools/:id/impersonate', requireSuperAdmin, c.impersonateSchool);
router.post('/schools/:id/suspend', requireSuperAdmin, c.suspendSchool);
router.post('/schools/:id/unsuspend', requireSuperAdmin, c.unsuspendSchool);
router.post('/broadcast', requireSuperAdmin, c.sendBroadcast);
router.get('/stats', requireSuperAdmin, c.getPlatformStats);
router.post('/schools/:id/reset-admin-password', requireSuperAdmin, c.resetAdminPassword);
router.post('/schools/:id/login-as', requireSuperAdmin, c.impersonateSchool);

router.put('/schools/:id/suspend', requireSuperAdmin, c.lockSchool);
router.put('/schools/:id/activate', requireSuperAdmin, c.unlockSchool);

module.exports = router;
