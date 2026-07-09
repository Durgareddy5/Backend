const rateLimit = require('express-rate-limit');

// Helper to construct standard rate limiter JSON error response
const createMessage = (message, code = 'TOO_MANY_REQUESTS') => ({
  success: false,
  message,
  error: { code }
});

const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  limit: 300, // Limit each IP to 300 requests per 15 minutes globally
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: createMessage('Too many requests from this IP. Please try again after 15 minutes.')
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  limit: 100, // Increased from 15 to 100 for local development/testing
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: createMessage('Too many authentication attempts. Please try again after 15 minutes.', 'AUTH_BRUTE_FORCE')
});

// Strict limiter for OTP generation (send) — 30 sends per 5 minutes
const otpLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  limit: 30, // Increased from 5 to 30
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: createMessage('Too many OTP requests. Please wait 5 minutes before requesting again.', 'OTP_THROTTLED')
});

// More permissive limiter for OTP verification — 100 attempts per 5 minutes
const verifyOtpLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  limit: 100, // Increased from 15 to 100
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: createMessage('Too many verification attempts. Please wait a few minutes and try again.', 'OTP_THROTTLED')
});

const searchLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  limit: 60, // Limit each IP to 60 searches per minute
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: createMessage('Too many search requests. Please slow down.', 'SEARCH_THROTTLED')
});

const scholarSyncLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 minutes
  limit: 3, // Limit each IP to 3 Google Scholar sync imports per 10 minutes
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: createMessage('Google Scholar portfolio synchronization is throttled to 3 times per 10 minutes.', 'SYNC_THROTTLED')
});

const uploadLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  limit: 50, // Limit each IP to 50 uploads per 15 minutes
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: createMessage('Too many file uploads from this IP. Please try again after 15 minutes.', 'UPLOAD_THROTTLED')
});

module.exports = {
  globalLimiter,
  authLimiter,
  otpLimiter,
  verifyOtpLimiter,
  searchLimiter,
  scholarSyncLimiter,
  uploadLimiter
};
