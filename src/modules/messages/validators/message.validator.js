const { param, body, query, validationResult } = require('express-validator');
const { ValidationError } = require('../../../common/errors/AppError');

const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return next(new ValidationError('Validation Error', errors.array()));
  }
  next();
};

const validateSendMessage = [
  body('conversationId')
    .optional()
    .isMongoId()
    .withMessage('conversationId must be a valid MongoDB ObjectId'),
  body('receiverId')
    .optional()
    .isMongoId()
    .withMessage('receiverId must be a valid MongoDB ObjectId'),
  body('type')
    .optional()
    .isIn([
      'text',
      'image',
      'pdf',
      'publication',
      'dataset',
      'project',
      'patent',
      'conference',
      'journal',
      'research_profile',
      'citation',
      'file',
      'system'
    ])
    .withMessage('Invalid message type'),
  body('text')
    .optional()
    .isString()
    .withMessage('text must be a string'),
  body('attachmentId')
    .optional()
    .isMongoId()
    .withMessage('attachmentId must be a valid MongoDB ObjectId'),
  body('replyTo')
    .optional()
    .isMongoId()
    .withMessage('replyTo must be a valid MongoDB ObjectId'),
  validate
];

const validateMessageId = [
  body('messageId')
    .isMongoId()
    .withMessage('messageId must be a valid MongoDB ObjectId'),
  validate
];

const validateReaction = [
  body('messageId')
    .isMongoId()
    .withMessage('messageId must be a valid MongoDB ObjectId'),
  body('reaction')
    .isString()
    .notEmpty()
    .withMessage('reaction must be a non-empty string'),
  validate
];

const validateConversationId = [
  param('conversationId')
    .isMongoId()
    .withMessage('conversationId must be a valid MongoDB ObjectId'),
  validate
];

module.exports = {
  validateSendMessage,
  validateMessageId,
  validateReaction,
  validateConversationId
};
