const router = require('express').Router();
const c = require('../controllers/onlineExamController');
const { requireMinRole } = require('../middleware/auth');
const staff = requireMinRole('teacher');
router.get('/', staff, c.getOnlineExams);
router.post('/', staff, c.createOnlineExam);
module.exports = router;