const router = require('express').Router();
const c = require('../controllers/searchAuditController');
const { requireMinRole } = require('../middleware/auth');
const admin = requireMinRole('principal');
router.get('/', admin, c.globalSearch);
module.exports = router;