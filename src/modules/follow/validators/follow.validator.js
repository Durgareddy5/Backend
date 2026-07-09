const { param, query } = require('express-validator');
const validationMiddleware = require('../../../common/middlewares/validation.middleware');

const followParamsValidator = [
  param('researcherId')
    .isMongoId()
    .withMessage('Invalid researcher ID format'),
  validationMiddleware
];

const usernameParamsValidator = [
  param('username')
    .trim()
    .notEmpty()
    .withMessage('Username is required'),
  validationMiddleware
];

const paginationQueryValidator = [
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be an integer between 1 and 100'),
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  query('cursor')
    .optional()
    .isString()
    .withMessage('Cursor must be a valid string identifier'),
  query('search')
    .optional()
    .isString()
    .trim(),
  validationMiddleware
];

module.exports = {
  followParamsValidator,
  usernameParamsValidator,
  paginationQueryValidator
};
