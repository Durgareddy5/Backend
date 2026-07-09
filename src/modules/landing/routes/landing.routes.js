const express = require('express');
const router = express.Router();
const landingController = require('../controller/landing.controller');

router.get('/', landingController.getWelcome);
router.get('/health', landingController.getHealth);
router.get('/database', landingController.getDatabaseHealth);
router.get('/stats', landingController.getStats);
router.get('/categories', landingController.getCategories);
router.get('/features', landingController.getFeatures);
router.get('/version', landingController.getVersion);

module.exports = router;
