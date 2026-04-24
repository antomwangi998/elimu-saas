// ============================================================
// OTP Controller — 2-factor verification
// Students: admission number based
// Staff: phone number → SMS OTP (2 min expiry)
// ============================================================
const { query } = require('../config/database');
const { cache } = require('../config/redis');
const logger = require('../config/logger');

const generateOTP = () => Math.floor(100000 + Math.random() * 900000).toString();

// Send SMS via Africa's Talking
const sendSMS = async (phone, message) => {
  try {
    const AT = require('africastalking');
    const at = AT({ apiKey: process.env.AT_API_KEY, username: process.env.AT_USERNAME || 'sandbox' });
    await at.SMS.send({ to: [phone], message, from: process.env.AT_SENDER_ID });
    return true;
  } catch (e) {
    logger.warn('SMS send failed:', e.message);
    return false;
  }
};

// POST /api/otp/request
// Body: { type: 'staff'|'student', identifier: phone_or_admno, schoolCode }
exports.requestOTP = async (req, res) => {
  try {
    const { type, identifier, schoolCode } = req.body;
    if (!type || !identifier) return res.status(400).json({ error: 'type and identifier required' });

    const otp = generateOTP();
    const expirySeconds = type === 'staff' ? 120 : 300; // 2 min staff, 5 min students
    let userId, name, phone, maskedTarget;

    if (type === 'staff') {
      // Look up by phone number OR userId (when phone not set)
      const { userId: bodyUserId } = req.body;
      let sql, params;
      if (identifier && identifier.length > 3) {
        sql = "SELECT u.id, u.first_name, u.phone FROM users u WHERE u.phone=$1 AND u.is_active=true AND u.role NOT IN ('student','parent')";
        params = [identifier];
      } else if (bodyUserId) {
        sql = "SELECT u.id, u.first_name, u.phone FROM users u WHERE u.id=$1 AND u.is_active=true";
        params = [bodyUserId];
      } else {
        return res.status(400).json({ error: 'Phone number or userId required' });
      }
      if (schoolCode) {
        sql += ' AND u.school_id=(SELECT id FROM schools WHERE school_code=$2 LIMIT 1)';
        params.push(schoolCode);
      }
      const { rows } = await query(sql, params);
      if (!rows.length) return res.status(404).json({ error: 'Phone number not found. Contact your admin.' });
      userId = rows[0].id;
      name   = rows[0].first_name;
      phone  = rows[0].phone;
      maskedTarget = phone.replace(/(\+?\d{3})\d+(\d{3})/, '$1****$2');

      // Store OTP
      await cache.set(`otp:${userId}`, { otp, userId }, expirySeconds);

      // Send SMS
      let smsSent = false;
      if (phone) {
        smsSent = await sendSMS(phone, `ElimuSaaS OTP: ${otp}. Valid for 2 minutes. Do not share.`);
      }
      res.json({
        message: phone ? `OTP sent to ${maskedTarget}` : 'OTP generated (no phone on file)',
        userId,
        name,
        expiresIn: expirySeconds,
        phone: maskedTarget || null,
        noPhone: !phone,
        // Always return OTP if SMS not sent (no phone or SMS failed)
        ...(!smsSent ? { otp, note: !phone ? 'No phone on file — OTP shown for admin use' : 'SMS unavailable — OTP shown' } : {}),
      });

    } else if (type === 'student') {
      // Look up by admission number
      let sql = 'SELECT s.id, s.first_name, s.user_id FROM students s WHERE s.admission_number=$1 AND s.is_active=true';
      const params = [identifier];
      if (schoolCode) {
        sql += ' AND s.school_id=(SELECT id FROM schools WHERE school_code=$2 LIMIT 1)';
        params.push(schoolCode);
      }
      const { rows } = await query(sql, params);
      if (!rows.length) return res.status(404).json({ error: 'Admission number not found.' });
      userId = rows[0].user_id || rows[0].id;
      name   = rows[0].first_name;

      // For students use admission number as identifier in cache
      await cache.set(`otp:adm:${identifier}`, { otp, studentId: rows[0].id, userId }, expirySeconds);

      res.json({
        message: `OTP generated for ${name}`,
        name,
        expiresIn: expirySeconds,
        // Students get OTP shown directly (no SMS - they verify at school)
        otp,
      });
    } else {
      return res.status(400).json({ error: 'type must be staff or student' });
    }
  } catch (e) {
    logger.error('requestOTP error:', e.message);
    res.status(500).json({ error: e.message });
  }
};

// POST /api/otp/verify
// Body: { type, identifier, otp, userId? }
exports.verifyOTP = async (req, res) => {
  try {
    const { type, identifier, otp, userId } = req.body;
    if (!otp || !identifier) return res.status(400).json({ error: 'identifier and otp required' });

    const cacheKey = type === 'student' ? `otp:adm:${identifier}` : `otp:${userId || identifier}`;
    const stored = await cache.get(cacheKey);

    if (!stored) return res.status(400).json({ error: 'OTP expired or not found. Request a new one.' });
    if (stored.otp !== otp) return res.status(400).json({ error: 'Invalid OTP. Please check and try again.' });

    // OTP valid — delete it (one-time use)
    await cache.del(cacheKey);

    // Return a short-lived verification token
    const { v4: uuidv4 } = require('uuid');
    const verifyToken = uuidv4();
    await cache.set(`otp_verified:${verifyToken}`, { userId: stored.userId, studentId: stored.studentId }, 600);

    res.json({ message: 'OTP verified', verified: true, verifyToken });
  } catch (e) {
    logger.error('verifyOTP error:', e.message);
    res.status(500).json({ error: e.message });
  }
};

// POST /api/otp/verify-forgot — verify OTP for password reset
exports.verifyForgotOTP = async (req, res) => {
  try {
    const { email, otp } = req.body;
    if (!email || !otp) return res.status(400).json({ error: 'email and otp required' });

    const stored = await cache.get(`pwd_otp:${email}`);
    if (!stored) return res.status(400).json({ error: 'OTP expired. Request a new password reset.' });
    if (stored.otp !== otp) return res.status(400).json({ error: 'Invalid OTP.' });

    res.json({ message: 'OTP verified', token: stored.token, verified: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};
