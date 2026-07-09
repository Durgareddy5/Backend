const { body, validationResult } = require('express-validator');
const { ValidationError } = require('../../../common/errors/AppError');

/**
 * Common middleware to validate fields and throw our custom ValidationError if failures exist
 */
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const details = {};
    errors.array().forEach(err => {
      details[err.path || err.param] = err.msg;
    });
    throw new ValidationError('Validation failed. Please correct the fields.', details);
  }
  next();
};

const savePublicationValidator = [
  body('title')
    .trim()
    .notEmpty()
    .withMessage('Title is required.'),
  body('publicationType')
    .trim()
    .notEmpty()
    .withMessage('Publication type is required.'),
  body('authorsList')
    .isArray({ min: 1 })
    .withMessage('At least one Author is required.'),
  body('authorsList.*.name')
    .trim()
    .notEmpty()
    .withMessage('Author name is required.'),
  handleValidationErrors
];

module.exports = {
  savePublicationValidator
};
