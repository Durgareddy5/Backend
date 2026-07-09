const { NotFoundError } = require('../errors/AppError');

const notFoundMiddleware = (req, res, next) => {
  next(new NotFoundError(`Resource not found - ${req.originalUrl}`));
};

module.exports = notFoundMiddleware;
