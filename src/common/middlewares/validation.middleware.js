const { validationResult } = require('express-validator');
const { ValidationError } = require('../errors/AppError');

const validationMiddleware = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const formattedErrors = errors.array().reduce((acc, curr) => {
      acc[curr.path || curr.param] = curr.msg;
      return acc;
    }, {});
    
    return next(new ValidationError('Validation failed', formattedErrors));
  }
  next();
};

module.exports = validationMiddleware;
