const express = require('express');
const router = express.Router();
const feedController = require('../controller/feed.controller');
const { authMiddleware } = require('../../../common/middlewares/auth.middleware');
const { searchLimiter } = require('../../../config/rateLimiter');
const {
  createPublicationValidator,
  toggleLikeValidator,
  toggleBookmarkValidator,
  moveBookmarkValidator,
  toggleRecommendationValidator,
  addCommentValidator,
  recordShareValidator,
  createDatasetValidator,
  searchValidator
} = require('../validator/feed.validator');

const responseCache = require('../../../cache/response-cache.middleware');

// Optional auth endpoint
router.get('/feed/publication/:id', (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authMiddleware(req, res, next);
  }
  next();
}, feedController.getPublicationById);

// All other endpoints require authentication
router.use(authMiddleware);

// Feeds
router.get('/feed', responseCache(10), feedController.getFeed);
router.get('/feed/trending', responseCache(30), feedController.getTrending);
router.get('/feed/recommended', responseCache(10), feedController.getRecommended);
router.get('/feed/latest', responseCache(20), feedController.getLatest);
router.get('/feed/following', responseCache(10), feedController.getFollowingFeed);
router.get('/home', responseCache(120), feedController.getHome);
router.get('/notifications', feedController.getNotifications);
router.get('/messages', feedController.getMessages);
router.get('/requests', feedController.getRequests);
router.get('/recommendations', responseCache(30), feedController.getRecommendations);

// Publications CRUD
router.post('/publication', createPublicationValidator, feedController.createPublication);
router.put('/publication/:id', createPublicationValidator, feedController.updatePublication);
router.delete('/publication/:id', feedController.deletePublication);

// Interactions
router.post('/publication/like', toggleLikeValidator, feedController.toggleLike);
router.post('/publication/bookmark', toggleBookmarkValidator, feedController.toggleBookmark);
router.post('/bookmark/move', moveBookmarkValidator, feedController.moveBookmark);
router.get('/bookmark/folders', responseCache(15), feedController.getBookmarkFolders);
router.post('/publication/share', recordShareValidator, feedController.recordShare);
router.post('/publication/recommend', toggleRecommendationValidator, feedController.toggleRecommendation);

// Comments & replies
router.post('/publication/comment', addCommentValidator, feedController.addComment);
router.get('/publication/:publicationId/comments', feedController.getComments);
router.post('/comment/:commentId/like', feedController.toggleLikeComment);

// Follow actions
router.post('/follow/:userId', feedController.toggleFollow);
router.get('/suggested-researchers', responseCache(60), feedController.getSuggestedResearchers);
router.get('/following', responseCache(15), feedController.getFollowingList);
router.get('/followers', responseCache(15), feedController.getFollowersList);

// AI & similar papers
router.get('/publication/:id/similar', responseCache(30), feedController.getSimilarPapers);
router.post('/publication/request-full-text', feedController.requestFullText);
router.post('/publication/ai-summary', feedController.getAiSummary);

// Datasets
router.post('/dataset', createDatasetValidator, feedController.createDataset);
router.get('/datasets', responseCache(10), feedController.getDatasets);

// Global Search
router.get('/search', searchLimiter, searchValidator, feedController.globalSearch);
router.get('/questions', responseCache(10), feedController.getQuestions);
router.get('/projects', responseCache(10), feedController.getProjects);
router.get('/events', responseCache(30), feedController.getEvents);

// ══════════════════════════════════════════════════
// PHASE 8 — MULTI-TYPE ACTIVITY FEED ROUTES
// ══════════════════════════════════════════════════
// Order matters: specific paths before generic :param paths
router.get('/feed/activity/following', responseCache(5), feedController.getActivityFeedFollowing);
router.get('/feed/activity/trending', responseCache(15), feedController.getActivityFeedTrending);
router.get('/feed/activity/latest', responseCache(10), feedController.getActivityFeedLatest);
router.get('/feed/activity', responseCache(5), feedController.getActivityFeed);
router.get('/feed/sidebar', responseCache(10), feedController.getFeedSidebar);
router.post('/feed/event', feedController.emitFeedEvent);
router.post('/feed/interact', feedController.recordFeedInteraction);

module.exports = router;
