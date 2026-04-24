const router = require('express').Router();
const c = require('../controllers/otpController');
// Public routes - no auth needed (user is trying to log in)
router.post('/request', c.requestOTP);
router.post('/verify',  c.verifyOTP);
router.post('/verify-forgot', c.verifyForgotOTP);
module.exports = router;
