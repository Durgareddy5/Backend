const { body, param, query } = require("express-validator");
const validationMiddleware = require("../../../common/middlewares/validation.middleware");

exports.createConversationValidator = [
  body("participantId")
    .isMongoId()
    .withMessage("Participant ID must be a valid Mongo ID."),
  validationMiddleware,
];

exports.sendMessageValidator = [
  param("conversationId")
    .isMongoId()
    .withMessage("Conversation ID must be a valid Mongo ID."),
  body("content")
    .optional()
    .isString()
    .trim()
    .isLength({ min: 1, max: 4000 })
    .withMessage("Message content must be between 1 and 4000 characters."),
  validationMiddleware,
];

exports.messageQueryValidator = [
  query("page")
    .optional()
    .isInt({ min: 1 })
    .withMessage("Page must be a positive integer."),
  query("limit")
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage("Limit must be between 1 and 100."),
  validationMiddleware,
];
