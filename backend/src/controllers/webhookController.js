// webhookController — M-Pesa and Africa's Talking webhooks
const { query } = require('../config/database');
const logger = require('../config/logger');

exports.mpesaCallback = async (req, res) => {
  try {
    logger.info('M-Pesa callback received:', JSON.stringify(req.body).slice(0,500));
    const body = req.body?.Body?.stkCallback || req.body;
    const code = body?.ResultCode ?? body?.resultCode;
    if (code === 0 || code === '0') {
      const meta = body?.CallbackMetadata?.Item || [];
      const get = (name) => meta.find(i => i.Name === name)?.Value;
      const amount   = parseFloat(get('Amount') || 0);
      const receipt  = get('MpesaReceiptNumber') || '';
      const phone    = get('PhoneNumber') || '';
      const checkoutId = body?.CheckoutRequestID;
      if (receipt && amount > 0) {
        await query(
          `UPDATE fee_payments SET status='completed', mpesa_receipt=$1, updated_at=NOW()
           WHERE reference=$2 OR (mpesa_phone=$3 AND status='pending' AND amount=$4)`,
          [receipt, checkoutId, phone, amount]).catch(()=>{});
      }
    }
    res.json({ ResultCode: 0, ResultDesc: 'Accepted' });
  } catch (e) {
    logger.error('M-Pesa webhook error:', e.message);
    res.json({ ResultCode: 0, ResultDesc: 'Accepted' }); // Always 200 to Safaricom
  }
};

exports.smsDelivery = async (req, res) => {
  try {
    logger.info('SMS delivery report:', JSON.stringify(req.body).slice(0,200));
    res.status(200).send('OK');
  } catch (e) { res.status(200).send('OK'); }
};

exports.getAll   = (req, res) => res.json({ endpoints: ['/webhooks/mpesa','/webhooks/sms'], data: [], total: 0 });
exports.getOne   = exports.getAll;
exports.create   = exports.getAll;
exports.update   = exports.getAll;
exports.remove   = exports.getAll;
