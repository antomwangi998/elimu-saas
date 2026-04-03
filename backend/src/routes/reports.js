const router = require('express').Router();
const c = require('../controllers/reportsController');
const { requireMinRole } = require('../middleware/auth');
const staff = requireMinRole('teacher');
router.get('/', staff, c.getReports);
router.post('/generate', staff, c.generateReport);
router.get('/attendance', staff, c.getAttendanceSummary);
router.get('/academic', staff, c.getAcademicSummary);
module.exports = router;