const express = require('express');
const router = express.Router();
const publicationController = require('../controller/publication.controller');
const { authMiddleware, optionalAuth } = require('../../../common/middlewares/auth.middleware');
const { savePublicationValidator } = require('../validator/publication.validator');
const { ValidationError } = require('../../../common/errors/AppError');
const citationRoutes = require('./citation.routes');
const analyticsRoutes = require('./analytics.routes');
const analyticsController = require('../controller/analytics.controller');
const responseCache = require('../../../cache/response-cache.middleware');
const { upload: universalUpload, validateUpload } = require('../../upload/middleware/upload.middleware');

// 1. Get My Publications (Drafts, Trash portfolio)
router.get('/my', authMiddleware, publicationController.getMyPublications);

// 2. Extract Metadata from file buffer
router.post(
  '/extract-metadata',
  authMiddleware,
  universalUpload.single('file'),
  validateUpload,
  publicationController.extractMetadata
);

// Alias /extract for Phase 1.5 spec
router.post(
  '/extract',
  authMiddleware,
  universalUpload.single('file'),
  validateUpload,
  publicationController.extractMetadata
);

// Get cached metadata by ID
router.get(
  '/metadata/:id',
  authMiddleware,
  publicationController.getMetadataCache
);

// Get all publication types
router.get('/types', publicationController.getTypes);

// Get all publication formats
router.get('/formats', publicationController.getFormats);

// 3. Upload file (Cloudinary)
router.post(
  '/upload',
  authMiddleware,
  universalUpload.single('file'),
  validateUpload,
  publicationController.uploadFile
);

// 4. Create/Publish Publication
router.post('/', authMiddleware, savePublicationValidator, publicationController.createPublication);
router.post('/create', authMiddleware, savePublicationValidator, publicationController.createPublication);

// 5. Save Draft
router.post('/save-draft', authMiddleware, savePublicationValidator, publicationController.saveDraft);

// 6. Publish from draft / Publish endpoint
router.post('/publish', authMiddleware, savePublicationValidator, publicationController.createPublication);

// 7. Get all publications
router.get('/', responseCache(30), publicationController.getPublications);

// 8. Get publication for reader
router.get('/read/:slug', optionalAuth, responseCache(30), publicationController.getPublicationForReader);

// 8.5 Get publications by researcher profile slug
router.get('/profile/:profileSlug', optionalAuth, responseCache(30), publicationController.getPublicationsByProfileSlug);

// 9. Get single publication by slug
router.get('/:slug', optionalAuth, responseCache(30), publicationController.getPublicationBySlug);

// 10. Update publication
router.patch('/:id', authMiddleware, publicationController.updatePublication);
router.put('/:id', authMiddleware, publicationController.updatePublication);

// 11. Delete publication
router.delete('/:id', authMiddleware, publicationController.deletePublication);

// 12. Restore soft-deleted publication
router.post('/:id/restore', authMiddleware, publicationController.restorePublication);

// 13. Track downloads
router.post('/:id/download', publicationController.trackDownload);

// 14. Bulk Actions
router.post('/bulk-action', authMiddleware, publicationController.bulkAction);

// 15. Duplicate Publication
router.post('/:id/duplicate', authMiddleware, publicationController.duplicatePublication);

// 16. Bookmark Publication
router.post('/:id/bookmark', authMiddleware, publicationController.toggleBookmark);

// 16.5 Unique View Tracking
router.post('/:id/view', optionalAuth, publicationController.trackViewPost);

// 16.6 Recommendations Toggling
router.post('/:id/recommend', authMiddleware, publicationController.toggleRecommendation);

// 16.7 Track Shares
router.post('/:id/share', authMiddleware, publicationController.trackShare);

// 16.8 Related publications & researchers
router.get('/:id/related', optionalAuth, responseCache(30), publicationController.getRelatedPublications);
router.get('/:id/related-researchers', optionalAuth, responseCache(30), publicationController.getRelatedResearchers);

// 16.9 Threaded Comments APIs
router.get('/:id/comments', optionalAuth, responseCache(15), publicationController.getComments);
router.post('/:id/comment', authMiddleware, publicationController.addComment);
router.put('/comments/:commentId', authMiddleware, publicationController.editComment);
router.delete('/comments/:commentId', authMiddleware, publicationController.deleteComment);
router.post('/comments/:commentId/like', authMiddleware, publicationController.toggleLikeComment);

// 17. Get publications by username
router.get('/profile/:username/publications', optionalAuth, responseCache(30), publicationController.getPublicationsByUsername);

// 18. Citation sub-router — GET/POST /:id/citation/*
router.use('/:id/citation', citationRoutes);

// 19. Analytics sub-router — GET /:id/analytics/*
router.use('/:id/analytics', analyticsRoutes);

// 20. Profile publication analytics
router.get('/profile-analytics/:profileSlug', authMiddleware, analyticsController.getProfileAnalytics);

module.exports = router;
