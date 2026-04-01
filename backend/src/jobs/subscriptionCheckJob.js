// ============================================================
// subscriptionCheckJob — Check school subscription status and send expiry alerts
// Scheduled Job (node-cron)
// ============================================================
const cron = require('node-cron');
const logger = require('../config/logger');

/**
 * Check school subscription status and send expiry alerts
 * @param {Object} db - Database connection
 */
const run = async (db) => {
  try {
    logger.info('[subscriptionCheckJob] Starting job...');
    // TODO: Job implementation
    logger.info('[subscriptionCheckJob] Job completed successfully');
  } catch (err) {
    logger.error('[subscriptionCheckJob] Job failed:', err.message);
  }
};

/**
 * Schedule this job
 */
const schedule = () => {
  // Run daily at 6 AM
  cron.schedule('0 6 * * *', () => run());
  logger.info('[subscriptionCheckJob] Scheduled');
};

module.exports = { run, schedule };
