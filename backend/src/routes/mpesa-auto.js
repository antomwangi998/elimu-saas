const router = require('express').Router();
const c = require('../controllers/mpesaController');
const { authMiddleware } = require('../middleware/auth');
router.post('/stk', authMiddleware, c.initiateStkPush);
router.post('/callback', c.stkCallback);
router.get('/status/:id', authMiddleware, c.checkStkStatus);
router.get('/receipt/:id', authMiddleware, c.downloadReceipt);
router.get('/history', authMiddleware, c.getPaymentHistory);
module.exports = router;