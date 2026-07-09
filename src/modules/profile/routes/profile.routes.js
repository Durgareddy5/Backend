const express = require('express');
const router = express.Router();
const profileController = require('../controller/profile.controller');
const { authMiddleware } = require('../../../common/middlewares/auth.middleware');
const { updateProfileValidator } = require('../validator/profile.validator');
const { scholarSyncLimiter } = require('../../../config/rateLimiter');
const { upload: universalUpload, validateUpload } = require('../../upload/middleware/upload.middleware');

// File Upload Endpoint (for Profile avatars and banners)
router.post(
  '/upload',
  authMiddleware,
  universalUpload.single('file'),
  (req, res, next) => { if (req.file) return validateUpload(req, res, next); next(); },
  profileController.uploadFile
);

// Profile detail retrieval for the logged in user (defined before dynamic slug to avoid collision)
router.get('/me', authMiddleware, profileController.getProfile);

// Public route to view a researcher profile by slug
router.get('/:profileSlug', profileController.getPublicProfile);

// Public route to retrieve researcher publications portfolio by profile slug
const { optionalAuth } = require('../../../common/middlewares/auth.middleware');
router.get('/:profileSlug/publications', optionalAuth, profileController.getPublicationsByProfileSlug);

// Secure routes below this point
router.use(authMiddleware);

// Bulk and specific PUT/PATCH endpoints for profile updates
router.put('/', updateProfileValidator, profileController.updateProfile);
router.patch('/', updateProfileValidator, profileController.updateProfile);
router.patch(
  '/banner',
  universalUpload.single('file'),
  (req, res, next) => { if (req.file) return validateUpload(req, res, next); next(); },
  profileController.updateBanner
);
router.patch(
  '/avatar',
  universalUpload.single('file'),
  (req, res, next) => { if (req.file) return validateUpload(req, res, next); next(); },
  profileController.updateAvatar
);
router.patch('/basic', updateProfileValidator, profileController.updateBasic);
router.patch('/about', updateProfileValidator, profileController.updateAbout);
router.patch('/skills', updateProfileValidator, profileController.updateSkills);
router.patch('/research', updateProfileValidator, profileController.updateResearch);
router.patch('/education', updateProfileValidator, profileController.updateEducation);
router.patch('/experience', updateProfileValidator, profileController.updateExperience);
router.patch('/projects', updateProfileValidator, profileController.updateProjects);
router.patch('/social', updateProfileValidator, profileController.updateSocial);
router.patch('/metrics', updateProfileValidator, profileController.updateMetrics);

// Analytics tracking and retrieval
router.get('/analytics', profileController.getAnalytics);
router.patch('/analytics/download', profileController.trackDownload);

// Background task trigger for Google Scholar Synchronization
router.post('/google-scholar/sync', scholarSyncLimiter, profileController.syncGoogleScholar);

// Soft delete account & profile
router.delete('/', profileController.deleteProfile);

module.exports = router;
