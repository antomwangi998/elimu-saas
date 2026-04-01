const router = require('express').Router();
const c = require('../controllers/bulkExportController');
const { requireMinRole } = require('../middleware/auth');
const admin = requireMinRole('principal');
router.post('/report-cards', admin, c.bulkExportReportCards);
router.post('/id-cards', admin, c.bulkExportIdCards);
router.post('/fee-statements', admin, c.bulkExportFeeStatements);
module.exports = router;