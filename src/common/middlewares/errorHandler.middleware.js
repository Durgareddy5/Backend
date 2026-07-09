const logger = require('../logger/winston');

const errorHandlerMiddleware = (err, req, res, next) => {
  let statusCode = err.statusCode || 500;
  let message = err.message || 'Internal Server Error';
  let errorDetails = err.details || null;
  let errorCode = err.errorCode || 'INTERNAL_ERROR';

  // Log error
  logger.error(`${req.id || 'N/A'} - ${req.method} ${req.originalUrl} - Error: ${err.message}`, {
    stack: err.stack,
    details: err.details,
    requestId: req.id
  });

  // Handle Mongoose validation error
  if (err.name === 'ValidationError') {
    statusCode = 400;
    errorCode = 'VALIDATION_ERROR';
    message = 'Validation failed';
    errorDetails = Object.keys(err.errors).reduce((acc, key) => {
      acc[key] = err.errors[key].message;
      return acc;
    }, {});
  }

  // Handle Mongoose cast error (invalid ID)
  if (err.name === 'CastError') {
    statusCode = 400;
    errorCode = 'INVALID_ID';
    message = `Invalid ${err.path}: ${err.value}`;
  }

  // Handle Mongoose duplicate key error
  if (err.code === 11000) {
    statusCode = 409;
    errorCode = 'DUPLICATE_KEY';
    const field = Object.keys(err.keyValue)[0];
    message = `A record with this ${field} already exists`;
  }

  // JWT error handlers
  if (err.name === 'JsonWebTokenError') {
    statusCode = 401;
    errorCode = 'INVALID_TOKEN';
    message = 'Invalid token. Please authenticate again';
  }

  if (err.name === 'TokenExpiredError') {
    statusCode = 401;
    errorCode = 'TOKEN_EXPIRED';
    message = 'Token expired. Please authenticate again';
  }

  const payload = {
    code: errorCode,
    ...(errorDetails && { details: errorDetails }),
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  };

  // If responseFormatter middleware was not loaded, fallback to raw express JSON
  if (res.error) {
    return res.error(message, payload, statusCode);
  }

  return res.status(statusCode).json({
    success: false,
    message,
    error: payload
  });
};

module.exports = errorHandlerMiddleware;
