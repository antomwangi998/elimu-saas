const router = require('express').Router();
const c = require('../controllers/exportController');
const { authMiddleware, requireMinRole } = require('../middleware/auth');
const { tenantMiddleware } = require('../middleware/tenant');
const auth  = [authMiddleware, tenantMiddleware];
const staff = [authMiddleware, tenantMiddleware, requireMinRole('teacher')];
const admin = [authMiddleware, tenantMiddleware, requireMinRole('principal')];

router.get('/',            ...auth,  c.getAll);
router.get('/students',    ...staff, c.exportStudents);
router.get('/fees',        ...staff, c.exportFees);
router.get('/marks',       ...staff, c.exportMarks);
router.get('/staff',       ...admin, c.exportStaff);
module.exports = router;
