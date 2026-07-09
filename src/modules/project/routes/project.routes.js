const express = require('express');
const router = express.Router();
const projectController = require('../controller/project.controller');
const { authMiddleware } = require('../../../common/middlewares/auth.middleware');
const { upload, validateUpload } = require('../../upload/middleware/upload.middleware');
const { uploadLimiter } = require('../../../config/rateLimiter');

// POST /api/v1/projects/upload
router.post(
  '/upload',
  authMiddleware,
  uploadLimiter,
  upload.single('file'),
  validateUpload,
  projectController.uploadFile
);

module.exports = router;
