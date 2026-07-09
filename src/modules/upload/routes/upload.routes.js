const express = require('express');
const router = express.Router();
const uploadController = require('../controller/upload.controller');
const { authMiddleware } = require('../../../common/middlewares/auth.middleware');
const { upload, validateUpload } = require('../middleware/upload.middleware');
const { uploadLimiter } = require('../../../config/rateLimiter');

// Upload file endpoint
router.post(
  '/',
  authMiddleware,
  uploadLimiter,
  upload.single('file'),
  validateUpload,
  uploadController.uploadFile
);

// Delete upload endpoint
router.delete(
  '/:assetId',
  authMiddleware,
  uploadController.deleteUpload
);

module.exports = router;
