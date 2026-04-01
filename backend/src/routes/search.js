const router = require('express').Router();
const c = require('../controllers/searchAuditController');
const { authMiddleware } = require('../middleware/auth');
router.get('/', authMiddleware, c.globalSearch);
router.get('/students', authMiddleware, c.searchStudents);
module.exports = router;