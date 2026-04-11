const router = require('express').Router();
const c = require('../controllers/resourcesTimelineController');
const { authMiddleware } = require('../middleware/auth');
router.get('/', authMiddleware, c.getResources);
router.post('/', authMiddleware, c.uploadResource);
module.exports = router;