const { verifyAccessToken } = require('../../common/utils/jwtHelper');
const logger = require('../../common/logger/winston');
const { UnauthorizedError } = require('../../common/errors/AppError');

/**
 * Socket.IO JWT Handshake Verification Middleware
 */
const socketAuthMiddleware = (socket, next) => {
  try {
    const token = socket.handshake.auth?.token || socket.handshake.headers?.authorization?.split(' ')[1];
    
    if (!token) {
      logger.warn('Socket connection blocked: missing authentication token.');
      return next(new Error('Authentication error: Token is required.'));
    }

    const decoded = verifyAccessToken(token);
    if (!decoded) {
      return next(new Error('Authentication error: Invalid or expired token.'));
    }

    // Attach decoded user token fields to socket
    socket.user = decoded; 
    next();
  } catch (err) {
    logger.error(`Socket auth handshake failed: ${err.message}`);
    next(new Error('Authentication error: Handshake failed.'));
  }
};

/**
 * In-memory Token-Bucket rate limiter middleware per socket connection.
 * Limits client emits to prevent denial of service (DoS) and event spam.
 */
const socketRateLimiter = (socket, next) => {
  const originalOnevent = socket.onevent;

  socket.onevent = function (packet) {
    const now = Date.now();
    
    // Set bucket capacity to 30 tokens, refilling 10 tokens per second
    if (!socket.rateLimiterBucket) {
      socket.rateLimiterBucket = {
        tokens: 30,
        lastRefill: now
      };
    }

    const bucket = socket.rateLimiterBucket;
    const elapsedSeconds = (now - bucket.lastRefill) / 1000;
    
    // Refill tokens
    bucket.tokens = Math.min(30, bucket.tokens + elapsedSeconds * 10);
    bucket.lastRefill = now;

    if (bucket.tokens < 1) {
      logger.warn(`[SOCKET RATE LIMIT] Socket ${socket.id} (User: ${socket.user?.id}) exceeded emit rate limits.`);
      socket.emit('rate_limit_exceeded', {
        success: false,
        message: 'Too many messages. Please slow down.'
      });
      return; // Intercept and block event execution
    }

    bucket.tokens -= 1;
    originalOnevent.apply(this, arguments);
  };

  next();
};

module.exports = {
  socketAuthMiddleware,
  socketRateLimiter
};
