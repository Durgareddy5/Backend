const { verifyAccessToken } = require('../utils/jwtHelper');
const { UnauthorizedError, ForbiddenError } = require('../errors/AppError');
const User = require('../../models/User');
const Session = require('../../models/Session');
const asyncHandler = require('./asyncHandler.middleware');

const authMiddleware = asyncHandler(async (req, res, next) => {
  let token = null;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    throw new UnauthorizedError('Access token is missing. Please log in.');
  }

  try {
    const decoded = verifyAccessToken(token);

    // Fetch user and make sure they are active
    const user = await User.findOne({ _id: decoded.userId, isDeleted: { $ne: true } });
    if (!user) {
      throw new UnauthorizedError('User account not found.');
    }

    if (user.status !== 'active') {
      throw new ForbiddenError(`Your account is currently ${user.status}. Please contact support.`);
    }

    if (user.isBlocked) {
      throw new ForbiddenError('Your account has been suspended.');
    }

    // Verify active session if sessionId is in decoded token
    if (decoded.sessionId) {
      const session = await Session.findOne({ 
        _id: decoded.sessionId, 
        userId: user._id, 
        active: true,
        isDeleted: { $ne: true }
      });
      
      if (!session) {
        throw new UnauthorizedError('Session has expired or been terminated.');
      }
      
      req.session = session;
    }

    req.user = user;
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      throw new UnauthorizedError('Access token has expired.');
    }
    if (error.name === 'JsonWebTokenError') {
      throw new UnauthorizedError('Invalid access token.');
    }
    throw error;
  }
});

// Middleware to restrict access by role
const hasRole = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      throw new UnauthorizedError('Authentication required.');
    }

    if (!roles.includes(req.user.role)) {
      throw new ForbiddenError('You do not have permission to access this resource.');
    }

    next();
  };
};

const optionalAuth = asyncHandler(async (req, res, next) => {
  let token = null;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return next();
  }

  try {
    const decoded = verifyAccessToken(token);
    const user = await User.findOne({ _id: decoded.userId, isDeleted: { $ne: true } });
    if (user && user.status === 'active' && !user.isBlocked) {
      req.user = user;
    }
  } catch (error) {
    // Silently catch and treat as guest
  }
  next();
});

module.exports = {
  authMiddleware,
  optionalAuth,
  hasRole
};
