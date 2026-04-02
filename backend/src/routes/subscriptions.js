const router = require('express').Router();
// TODO: Wire controller for subscriptions
router.get('/', (req,res) => res.json({ module: 'subscriptions', status: 'active' }));
module.exports = router;
