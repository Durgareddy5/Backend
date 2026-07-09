const express = require('express');
const router = express.Router();
const scholarController = require('../controller/scholar.controller');
const { authMiddleware } = require('../../../common/middlewares/auth.middleware');
const { researchIdentityValidator } = require('../validator/scholar.validator');
const { scholarSyncLimiter } = require('../../../config/rateLimiter');

// Require authentication for all scholar endpoints
router.use(authMiddleware);

// Research Identity links
router.post('/research-identity', researchIdentityValidator, scholarController.saveResearchIdentity);

// Scholar synchronization & imports
router.post('/scholar/import', scholarSyncLimiter, scholarController.importScholar);
router.post('/scholar/reimport', scholarSyncLimiter, scholarController.reimportScholar);
router.post('/scholar/sync', scholarSyncLimiter, scholarController.syncScholar);

// Status checking
router.get('/scholar/import-status', scholarController.getImportStatus);
router.get('/scholar/import/status/:jobId', scholarController.getImportStatus);

// Data retrieval endpoints
router.get('/scholar/profile', scholarController.getProfile);
router.get('/scholar/publications', scholarController.getPublications);
router.get('/scholar/coauthors', scholarController.getCoAuthors);
router.get('/scholar/citations', scholarController.getCitations);
router.get('/scholar/analytics', scholarController.getAnalytics);

// Google Scholar V2 aliased endpoints (Phase 4)
router.post('/google-scholar/sync', scholarSyncLimiter, scholarController.syncScholar);
router.post('/google-scholar/publications', scholarSyncLimiter, scholarController.syncPublications);
router.post('/google-scholar/metrics', scholarSyncLimiter, scholarController.syncMetrics);
router.get('/google-scholar/status', scholarController.getImportStatus);

module.exports = router;
