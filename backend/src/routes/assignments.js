const router = require('express').Router();
const c = require('../controllers/assignmentsController');
const { requireMinRole, authMiddleware } = require('../middleware/auth');
const staff = requireMinRole('teacher');
router.get('/', authMiddleware, c.getAssignments);
router.post('/', staff, c.createAssignment);
router.post('/:id/submit', authMiddleware, c.submitAssignment);
router.post('/:id/grade', staff, c.gradeSubmission);
module.exports = router;