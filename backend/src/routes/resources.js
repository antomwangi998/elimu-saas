const router = require('express').Router();
const c = require('../controllers/resourcesTimelineController');
const { authMiddleware, requireMinRole } = require('../middleware/auth');
const staff = requireMinRole('teacher');
router.get('/', authMiddleware, c.getResources);
router.post('/', staff, c.uploadResource);
router.post('/:id/rate', authMiddleware, c.rateResource);
router.post('/:id/view', authMiddleware, c.trackView);
module.exports = router;