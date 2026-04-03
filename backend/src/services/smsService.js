// ============================================================
// SMS Service — Africa's Talking
// ============================================================
const logger = require('../config/logger');

let AT;
const getAT = () => {
  if (!AT) {
    const AfricasTalking = require('africastalking');
    AT = AfricasTalking({ apiKey: process.env.AT_API_KEY, username: process.env.AT_USERNAME });
  }
  return AT;
};

const sendSms = async ({ to, message, senderId }) => {
  try {
    const sms = getAT().SMS;
    const recipients = Array.isArray(to) ? to : [to];
    const cleanNumbers = recipients.map(n => {
      const cleaned = n.toString().replace(/\D/g, '');
      return cleaned.startsWith('0') ? `+254${cleaned.slice(1)}` :
             cleaned.startsWith('254') ? `+${cleaned}` : `+254${cleaned}`;
    });

    const result = await sms.send({
      to: cleanNumbers,
      message: message.substring(0, 160),
      from: senderId || process.env.AT_SENDER_ID || 'ELIMU',
    });

    logger.info(`SMS sent to ${cleanNumbers.length} recipients`);
    return result;
  } catch (err) {
    logger.error('SMS error:', err.message);
    throw err;
  }
};

const sendBulkSms = async (messages) => {
  const results = [];
  for (const m of messages) {
    try {
      await sendSms(m);
      results.push({ to: m.to, status: 'sent' });
    } catch (err) {
      results.push({ to: m.to, status: 'failed', error: err.message });
    }
  }
  return results;
};

module.exports = { sendSms, sendBulkSms };
