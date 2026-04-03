// ============================================================
// Global Error Handler Middleware
// ============================================================
const logger = require('../config/logger');

const errorHandler = (err, req, res, next) => {
  let status = err.status || err.statusCode || 500;
  let message = err.message || 'Internal Server Error';

  // PostgreSQL errors
  if (err.code === '23505') { // Unique violation
    status = 409;
    const field = err.detail?.match(/\((.+?)\)/)?.[1] || 'field';
    message = `A record with this ${field} already exists`;
  } else if (err.code === '23503') { // Foreign key violation
    status = 400;
    message = 'Referenced record does not exist';
  } else if (err.code === '23502') { // Not null violation
    status = 400;
    message = `Required field missing: ${err.column}`;
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') { status = 401; message = 'Invalid token'; }
  if (err.name === 'TokenExpiredError') { status = 401; message = 'Token expired'; }

  // Validation errors
  if (err.name === 'ValidationError') { status = 422; }

  if (status >= 500) {
    logger.error(`[${status}] ${req.method} ${req.path}: ${err.message}`, {
      stack: err.stack, body: req.body,
    });
  }

  res.status(status).json({
    error: message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
};

module.exports = errorHandler;
