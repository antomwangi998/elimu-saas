// ============================================================
// feeReminderJob — Send fee reminders to parents with outstanding balances
// Scheduled Job (node-cron)
// ============================================================
const cron = require('node-cron');
const logger = require('../config/logger');

/**
 * Send fee reminders to parents with outstanding balances
 * @param {Object} db - Database connection
 */
const run = async (db) => {
  try {
    logger.info('[feeReminderJob] Starting job...');
    // TODO: Job implementation
    logger.info('[feeReminderJob] Job completed successfully');
  } catch (err) {
    logger.error('[feeReminderJob] Job failed:', err.message);
  }
};

/**
 * Schedule this job
 */
const schedule = () => {
  // Run daily at 6 AM
  cron.schedule('0 6 * * *', () => run());
  logger.info('[feeReminderJob] Scheduled');
};

module.exports = { run, schedule };
