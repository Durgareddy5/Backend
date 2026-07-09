const { param, body } = require('express-validator');
const validationMiddleware = require('../../../common/middlewares/validation.middleware');

const researcherParamValidator = [
  param('researcherId')
    .isMongoId()
    .withMessage('Invalid researcher ID format'),
  validationMiddleware
];

const requestParamValidator = [
  param('requestId')
    .isMongoId()
    .withMessage('Invalid connection request ID format'),
  validationMiddleware
];

const connectionParamValidator = [
  param('connectionId')
    .isMongoId()
    .withMessage('Invalid connection ID format'),
  validationMiddleware
];

const sendRequestValidator = [
  param('researcherId')
    .isMongoId()
    .withMessage('Invalid researcher ID format'),
  body('note')
    .optional()
    .trim()
    .isLength({ max: 300 })
    .withMessage('Optional personal note cannot exceed 300 characters'),
  validationMiddleware
];

module.exports = {
  researcherParamValidator,
  requestParamValidator,
  connectionParamValidator,
  sendRequestValidator
};
