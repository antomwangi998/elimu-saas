const router = require('express').Router();
const c = require('../controllers/bulkOperationsController');
const { authMiddleware, requireMinRole } = require('../middleware/auth');
const { tenantMiddleware } = require('../middleware/tenant');
const admin = [authMiddleware, tenantMiddleware, requireMinRole('principal')];
const staff = [authMiddleware, tenantMiddleware, requireMinRole('teacher')];

router.get('/',              ...staff, c.getAll);
router.post('/promote',      ...admin, c.promoteStudents);
router.post('/fees',         ...admin, c.bulkAssignFees);
router.post('/attendance',   ...staff, c.bulkAttendance);
module.exports = router;
