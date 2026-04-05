const router = require('express').Router();
const c = require('../controllers/documentsController');
const { authMiddleware, requireMinRole } = require('../middleware/auth');
router.get('/', authMiddleware, c.getDocuments);
router.post('/', authMiddleware, c.uploadDocument);
router.delete('/:id', requireMinRole('teacher'), c.deleteDocument);
module.exports = router;