const express = require('express');
const router = express.Router();
const datasetController = require('../controller/dataset.controller');
const { authMiddleware } = require('../../../common/middlewares/auth.middleware');
const { upload, validateUpload } = require('../../upload/middleware/upload.middleware');
const { uploadLimiter } = require('../../../config/rateLimiter');

// POST /api/v1/datasets/upload
router.post(
  '/upload',
  authMiddleware,
  uploadLimiter,
  upload.single('file'),
  validateUpload,
  datasetController.uploadFile
);

module.exports = router;
