const express = require('express');
const router = express.Router();
const identityController = require('../controller/identity.controller');
const { authMiddleware } = require('../../../common/middlewares/auth.middleware');
const { 
  validateConnectProvider,
  validateSyncProvider
} = require('../validators/identity.validator');

// Protect all identity routes
router.use(authMiddleware);

// Connections
router.post('/connect', validateConnectProvider, identityController.connectProvider);
router.post('/disconnect', identityController.disconnectProvider);
router.post('/sync', validateSyncProvider, identityController.triggerSync);

// Data retrieval
router.get('/profile', identityController.getProfile);
router.get('/providers', identityController.getProviders);
router.get('/metrics', identityController.getMetrics);
router.get('/coauthors', identityController.getCoAuthors);

module.exports = router;
