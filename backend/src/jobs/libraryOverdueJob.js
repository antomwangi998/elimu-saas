// ============================================================
// libraryOverdueJob — Check for overdue books and send fine notifications
// Scheduled Job (node-cron)
// ============================================================
const cron = require('node-cron');
const logger = require('../config/logger');

/**
 * Check for overdue books and send fine notifications
 * @param {Object} db - Database connection
 */
const run = async (db) => {
  try {
    logger.info('[libraryOverdueJob] Starting job...');
    // TODO: Job implementation
    logger.info('[libraryOverdueJob] Job completed successfully');
  } catch (err) {
    logger.error('[libraryOverdueJob] Job failed:', err.message);
  }
};

/**
 * Schedule this job
 */
const schedule = () => {
  // Run daily at 6 AM
  cron.schedule('0 6 * * *', () => run());
  logger.info('[libraryOverdueJob] Scheduled');
};

module.exports = { run, schedule };
