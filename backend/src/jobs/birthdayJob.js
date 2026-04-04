// ============================================================
// birthdayJob — Send birthday wishes to staff and students
// Scheduled Job (node-cron)
// ============================================================
const cron = require('node-cron');
const logger = require('../config/logger');

/**
 * Send birthday wishes to staff and students
 * @param {Object} db - Database connection
 */
const run = async (db) => {
  try {
    logger.info('[birthdayJob] Starting job...');
    // TODO: Job implementation
    logger.info('[birthdayJob] Job completed successfully');
  } catch (err) {
    logger.error('[birthdayJob] Job failed:', err.message);
  }
};

/**
 * Schedule this job
 */
const schedule = () => {
  // Run daily at 6 AM
  cron.schedule('0 6 * * *', () => run());
  logger.info('[birthdayJob] Scheduled');
};

module.exports = { run, schedule };
