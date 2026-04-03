// ============================================================
// sessionCleanupJob — Clean up expired JWT tokens and sessions
// Scheduled Job (node-cron)
// ============================================================
const cron = require('node-cron');
const logger = require('../config/logger');

/**
 * Clean up expired JWT tokens and sessions
 * @param {Object} db - Database connection
 */
const run = async (db) => {
  try {
    logger.info('[sessionCleanupJob] Starting job...');
    // TODO: Job implementation
    logger.info('[sessionCleanupJob] Job completed successfully');
  } catch (err) {
    logger.error('[sessionCleanupJob] Job failed:', err.message);
  }
};

/**
 * Schedule this job
 */
const schedule = () => {
  // Run daily at 6 AM
  cron.schedule('0 6 * * *', () => run());
  logger.info('[sessionCleanupJob] Scheduled');
};

module.exports = { run, schedule };
