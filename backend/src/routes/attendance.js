const router = require('express').Router();
const c = require('../controllers/attendanceController');
const { requireMinRole } = require('../middleware/auth');
const staff = requireMinRole('teacher');
router.get('/', staff, c.getClassAttendance);
router.post('/', staff, c.markAttendance);
router.get('/summary', staff, c.getAttendanceSummary);
module.exports = router;