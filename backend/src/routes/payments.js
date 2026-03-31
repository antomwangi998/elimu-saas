const router = require('express').Router();
const c = require('../controllers/miscControllers');
const { authMiddleware } = require('../middleware/auth');
router.get('/', authMiddleware, c.getPayments);
module.exports = router;