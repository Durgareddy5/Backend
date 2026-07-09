const { body, param, validationResult } = require('express-validator');
const { ValidationError } = require('../../../common/errors/AppError');

const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return next(new ValidationError('Validation Error', errors.array()));
  }
  next();
};

const validateConnectProvider = [
  body('provider')
    .isIn([
      'google_scholar',
      'orcid',
      'scopus',
      'crossref',
      'openalex',
      'semantic_scholar',
      'dblp',
      'github',
      'linkedin'
    ])
    .withMessage('Invalid provider name'),
  body('providerUserId')
    .notEmpty()
    .withMessage('providerUserId is required')
    .trim(),
  body('providerUrl')
    .optional()
    .isURL()
    .withMessage('providerUrl must be a valid URL'),
  body('preferredName')
    .optional()
    .trim(),
  validate
];

const validateSyncProvider = [
  body('provider')
    .isIn([
      'google_scholar',
      'orcid',
      'scopus',
      'crossref',
      'openalex',
      'semantic_scholar',
      'dblp',
      'github',
      'linkedin'
    ])
    .withMessage('Invalid provider name'),
  validate
];

module.exports = {
  validateConnectProvider,
  validateSyncProvider
};
