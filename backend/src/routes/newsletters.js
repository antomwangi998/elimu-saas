const router = require('express').Router();
const c = require('../controllers/communicationController');
const { requireMinRole } = require('../middleware/auth');
const staff = requireMinRole('teacher');
router.get('/', staff, c.getMessages);
router.post('/', staff, c.sendAnnouncement);
module.exports = router;