const { query, body, param } = require('express-validator');
const validationMiddleware = require('../../../common/middlewares/validation.middleware');

exports.getNotificationsValidator = [
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('limit must be between 1 and 100'),
  query('cursor').optional().isString().withMessage('cursor must be a valid string'),
  query('isRead').optional().isBoolean().withMessage('isRead must be a boolean'),
  query('type').optional().isString().withMessage('type must be a string'),
  validationMiddleware
];

exports.updateSettingsValidator = [
  body('follow').optional().isBoolean().withMessage('follow must be a boolean'),
  body('connection').optional().isBoolean().withMessage('connection must be a boolean'),
  body('publication').optional().isBoolean().withMessage('publication must be a boolean'),
  body('comment').optional().isBoolean().withMessage('comment must be a boolean'),
  body('mention').optional().isBoolean().withMessage('mention must be a boolean'),
  body('system').optional().isBoolean().withMessage('system must be a boolean'),
  validationMiddleware
];

exports.notificationIdValidator = [
  param('notificationId').isMongoId().withMessage('Invalid notification id'),
  validationMiddleware
];
