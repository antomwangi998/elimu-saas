// ============================================================
// syllabusAlertJob — Alert teachers with low syllabus coverage
// Scheduled Job (node-cron)
// ============================================================
const cron = require('node-cron');
const logger = require('../config/logger');

/**
 * Alert teachers with low syllabus coverage
 * @param {Object} db - Database connection
 */
const run = async (db) => {
  try {
    logger.info('[syllabusAlertJob] Starting job...');
    // TODO: Job implementation
    logger.info('[syllabusAlertJob] Job completed successfully');
  } catch (err) {
    logger.error('[syllabusAlertJob] Job failed:', err.message);
  }
};

/**
 * Schedule this job
 */
const schedule = () => {
  // Run daily at 6 AM
  cron.schedule('0 6 * * *', () => run());
  logger.info('[syllabusAlertJob] Scheduled');
};

module.exports = { run, schedule };
