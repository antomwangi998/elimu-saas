const router = require('express').Router();
const c = require('../controllers/miscControllers');
const { authMiddleware, requireMinRole } = require('../middleware/auth');
router.get('/', authMiddleware, c.getSettings);
router.put('/', requireMinRole('principal'), c.updateSettings);
module.exports = router;