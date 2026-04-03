const router = require('express').Router();
const c = require('../controllers/roleDashboardController');
const { authMiddleware } = require('../middleware/auth');
router.get('/', authMiddleware, c.getRoleDashboard);
router.post('/exam-papers/:id/approve', authMiddleware, c.approveExamPaper);
module.exports = router;