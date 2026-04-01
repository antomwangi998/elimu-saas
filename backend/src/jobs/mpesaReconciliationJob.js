// ============================================================
// mpesaReconciliationJob — Reconcile M-Pesa transactions with fee records
// Scheduled Job (node-cron)
// ============================================================
const cron = require('node-cron');
const logger = require('../config/logger');

/**
 * Reconcile M-Pesa transactions with fee records
 * @param {Object} db - Database connection
 */
const run = async (db) => {
  try {
    logger.info('[mpesaReconciliationJob] Starting job...');
    // TODO: Job implementation
    logger.info('[mpesaReconciliationJob] Job completed successfully');
  } catch (err) {
    logger.error('[mpesaReconciliationJob] Job failed:', err.message);
  }
};

/**
 * Schedule this job
 */
const schedule = () => {
  // Run daily at 6 AM
  cron.schedule('0 6 * * *', () => run());
  logger.info('[mpesaReconciliationJob] Scheduled');
};

module.exports = { run, schedule };
