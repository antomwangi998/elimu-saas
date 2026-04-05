// ============================================================
// Email Service — Nodemailer + Templates
// ============================================================
const nodemailer = require('nodemailer');
const logger = require('../config/logger');

let transporter;

const getTransporter = () => {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT) || 587,
      secure: process.env.SMTP_SECURE === 'true',
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    });
  }
  return transporter;
};

const sendEmail = async ({ to, subject, html, text, attachments = [] }) => {
  try {
    const info = await getTransporter().sendMail({
      from: `"${process.env.EMAIL_FROM_NAME || 'ElimuSaaS'}" <${process.env.EMAIL_FROM_ADDRESS}>`,
      to: Array.isArray(to) ? to.join(',') : to,
      subject,
      html,
      text,
      attachments,
    });
    logger.info(`Email sent: ${info.messageId} to ${to}`);
    return info;
  } catch (err) {
    logger.error('Email send error:', err.message);
    throw err;
  }
};

const sendBulkEmails = async (recipients) => {
  const results = [];
  for (const r of recipients) {
    try {
      await sendEmail(r);
      results.push({ to: r.to, status: 'sent' });
    } catch (err) {
      results.push({ to: r.to, status: 'failed', error: err.message });
    }
  }
  return results;
};

module.exports = { sendEmail, sendBulkEmails };
