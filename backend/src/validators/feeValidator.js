// ============================================================
// feeValidator — Validate fee structure and invoice payloads
// ============================================================
const { body, param, query, validationResult } = require('express-validator');

/**
 * Middleware to handle validation errors
 */
const handleValidation = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(422).json({
      error: 'Validation failed',
      details: errors.array().map(e => ({ field: e.path, message: e.msg })),
    });
  }
  next();
};

// ── Validation Rules ──────────────────────────────────────────

const validateId = param('id').isUUID().withMessage('Invalid ID format');

const validatePagination = [
  query('limit').optional().isInt({ min: 1, max: 500 }).withMessage('Limit must be 1-500'),
  query('offset').optional().isInt({ min: 0 }).withMessage('Offset must be >= 0'),
];

// Export validators
module.exports = {
  handleValidation,
  validateId,
  validatePagination,
};
