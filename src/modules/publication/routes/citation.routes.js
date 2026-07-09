const express = require('express');
const router = express.Router({ mergeParams: true });
const citationController = require('../controller/citation.controller');
const { optionalAuth } = require('../../../common/middlewares/auth.middleware');

// All citation endpoints are public (no auth required for reading)
// POST /track uses optionalAuth to record who tracked

// GET /api/v1/publications/:id/citation — all formats
router.get('/', citationController.getAllCitations);

// GET /api/v1/publications/:id/citation/stats
router.get('/stats', citationController.getCitationStats);

// GET /api/v1/publications/:id/citation/:format
router.get('/:format', citationController.getCitationByFormat);

// POST /api/v1/publications/:id/citation/track
router.post('/track', optionalAuth, citationController.trackCitationEvent);

module.exports = router;
