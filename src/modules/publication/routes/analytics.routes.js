const express = require('express');
const router = express.Router({ mergeParams: true });
const analyticsController = require('../controller/analytics.controller');
const { authMiddleware } = require('../../../common/middlewares/auth.middleware');

// All analytics require authentication (owner-only data)

// GET /api/v1/publications/:id/analytics
router.get('/', authMiddleware, analyticsController.getPublicationAnalytics);

// GET /api/v1/publications/:id/analytics/views
router.get('/views', authMiddleware, analyticsController.getViewsTimeline);

// GET /api/v1/publications/:id/analytics/downloads
router.get('/downloads', authMiddleware, analyticsController.getDownloadsTimeline);

module.exports = router;
