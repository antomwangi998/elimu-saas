const router = require('express').Router();
const c = require('../controllers/miscControllers');
const { authMiddleware, requireMinRole } = require('../middleware/auth');
router.get('/my-school', authMiddleware, c.getMySchool);
router.get('/my', authMiddleware, c.getMySchool);
router.put('/my', requireMinRole('principal'), c.updateSchool);
router.put('/my-school', requireMinRole('principal'), c.updateSchool);
module.exports = router;