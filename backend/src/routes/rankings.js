const router = require('express').Router();
const c = require('../controllers/miscControllers');
const { requireMinRole } = require('../middleware/auth');
router.get('/', requireMinRole('teacher'), c.getRankings);
module.exports = router;