const { body, param, query } = require('express-validator');
const validationMiddleware = require('../../../common/middlewares/validation.middleware');

const createPublicationValidator = [
  body('title')
    .trim()
    .notEmpty()
    .withMessage('Publication title is required')
    .isLength({ max: 300 })
    .withMessage('Title cannot exceed 300 characters'),
  body('authors')
    .trim()
    .notEmpty()
    .withMessage('Authors list is required'),
  body('keywords')
    .optional()
    .isArray()
    .withMessage('Keywords must be an array of strings'),
  validationMiddleware
];

const toggleLikeValidator = [
  body('publicationId')
    .trim()
    .notEmpty()
    .withMessage('Publication ID is required')
    .isMongoId()
    .withMessage('Invalid Publication ID format'),
  validationMiddleware
];

const toggleBookmarkValidator = [
  body('publicationId')
    .trim()
    .notEmpty()
    .withMessage('Publication ID is required')
    .isMongoId()
    .withMessage('Invalid Publication ID format'),
  body('folderName')
    .optional()
    .trim()
    .isLength({ max: 50 })
    .withMessage('Folder name cannot exceed 50 characters'),
  validationMiddleware
];

const moveBookmarkValidator = [
  body('publicationId')
    .trim()
    .notEmpty()
    .withMessage('Publication ID is required')
    .isMongoId()
    .withMessage('Invalid Publication ID format'),
  body('folderName')
    .trim()
    .notEmpty()
    .withMessage('Folder name is required')
    .isLength({ max: 50 })
    .withMessage('Folder name cannot exceed 50 characters'),
  validationMiddleware
];

const toggleRecommendationValidator = [
  body('publicationId')
    .trim()
    .notEmpty()
    .withMessage('Publication ID is required')
    .isMongoId()
    .withMessage('Invalid Publication ID format'),
  validationMiddleware
];

const addCommentValidator = [
  body('publicationId')
    .trim()
    .notEmpty()
    .withMessage('Publication ID is required')
    .isMongoId()
    .withMessage('Invalid Publication ID format'),
  body('text')
    .trim()
    .notEmpty()
    .withMessage('Comment text cannot be empty')
    .isLength({ max: 1000 })
    .withMessage('Comment cannot exceed 1000 characters'),
  body('parentId')
    .optional()
    .trim()
    .isMongoId()
    .withMessage('Invalid parent comment ID format'),
  validationMiddleware
];

const recordShareValidator = [
  body('publicationId')
    .trim()
    .notEmpty()
    .withMessage('Publication ID is required')
    .isMongoId()
    .withMessage('Invalid Publication ID format'),
  body('platform')
    .optional()
    .trim()
    .isIn(['internal', 'twitter', 'linkedin', 'email', 'copy_link'])
    .withMessage('Invalid sharing platform'),
  validationMiddleware
];

const createDatasetValidator = [
  body('title')
    .trim()
    .notEmpty()
    .withMessage('Dataset title is required'),
  body('description')
    .trim()
    .notEmpty()
    .withMessage('Dataset description is required'),
  body('format')
    .trim()
    .notEmpty()
    .withMessage('Dataset format (e.g. CSV) is required'),
  validationMiddleware
];

const searchValidator = [
  query('query')
    .optional()
    .trim(),
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be an integer between 1 and 100'),
  validationMiddleware
];

module.exports = {
  createPublicationValidator,
  toggleLikeValidator,
  toggleBookmarkValidator,
  moveBookmarkValidator,
  toggleRecommendationValidator,
  addCommentValidator,
  recordShareValidator,
  createDatasetValidator,
  searchValidator
};
