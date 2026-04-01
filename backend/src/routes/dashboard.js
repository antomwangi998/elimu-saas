const router = require('express').Router();
const c = require('../controllers/dashboardController');
const { authMiddleware } = require('../middleware/auth');
router.get('/', authMiddleware, c.getDashboard);
module.exports = router;