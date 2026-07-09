const express = require('express');
const router = express.Router();
const searchController = require('../controller/search.controller');
const { authMiddleware, optionalAuth } = require('../../../common/middlewares/auth.middleware');
const { searchLimiter } = require('../../../config/rateLimiter');
const responseCache = require('../../../cache/response-cache.middleware');

// All search routes are rate-limited
// Public routes use optionalAuth (history saved only for auth users)

// GET /api/v1/search  — unified search
router.get('/', searchLimiter, optionalAuth, responseCache(15), searchController.search);

// GET /api/v1/search/publications
router.get('/publications', searchLimiter, optionalAuth, responseCache(15), searchController.searchPublications);

// GET /api/v1/search/authors
router.get('/authors', searchLimiter, optionalAuth, responseCache(30), searchController.searchAuthors);

// GET /api/v1/search/researchers
router.get('/researchers', searchLimiter, optionalAuth, responseCache(30), searchController.searchResearchers);

// GET /api/v1/search/journals
router.get('/journals', searchLimiter, optionalAuth, responseCache(30), searchController.searchJournals);

// GET /api/v1/search/conferences
router.get('/conferences', searchLimiter, optionalAuth, responseCache(30), searchController.searchConferences);

// GET /api/v1/search/autocomplete
router.get('/autocomplete', searchLimiter, responseCache(10), searchController.autocomplete);

// GET /api/v1/search/suggestions
router.get('/suggestions', searchLimiter, responseCache(10), searchController.autocomplete);

// GET /api/v1/search/trending
router.get('/trending', responseCache(60), searchController.getTrending);

// GET /api/v1/search/history  (auth required)
router.get('/history', authMiddleware, searchController.getHistory);

// POST /api/v1/search/history
router.post('/history', authMiddleware, searchController.saveHistory);

// DELETE /api/v1/search/history?id=optional
router.delete('/history', authMiddleware, searchController.clearHistory);

// PATCH /api/v1/search/history/:id/favorite
router.patch('/history/:id/favorite', authMiddleware, searchController.toggleFavorite);

module.exports = router;
