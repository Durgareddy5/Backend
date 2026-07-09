const express = require('express');
const router = express.Router();
const recommendationsController = require('../controller/recommendations.controller');
const { authMiddleware } = require('../../../common/middlewares/auth.middleware');

// Protect all routes
router.use(authMiddleware);

// Recommendation endpoints
router.get('/researchers', recommendationsController.getResearchers);
router.get('/publications', recommendationsController.getPublications);

router.get('/projects', recommendationsController.getProjects);
router.get('/funding', recommendationsController.getFunding);
router.get('/conferences', recommendationsController.getConferences);
router.post('/refresh', recommendationsController.refreshRecommendations);

module.exports = router;
