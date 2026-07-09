const express = require('express');
const router = express.Router();
const connectionsController = require('../controller/connections.controller');
const { authMiddleware } = require('../../../common/middlewares/auth.middleware');
const {
  researcherParamValidator,
  requestParamValidator,
  connectionParamValidator,
  sendRequestValidator
} = require('../validators/connections.validator');

// All connection routes require authentication
router.use(authMiddleware);

// Get list of connections, received, and sent requests
router.get('/', connectionsController.getConnections);
router.get('/requests/received', connectionsController.getReceivedRequests);
router.get('/requests/sent', connectionsController.getSentRequests);

// Connection status with specific researcher
router.get('/status/:researcherId', researcherParamValidator, connectionsController.getConnectionStatus);

// Connection request actions
router.post('/request/:researcherId', sendRequestValidator, connectionsController.sendConnectionRequest);
router.patch('/accept/:requestId', requestParamValidator, connectionsController.acceptConnectionRequest);
router.patch('/reject/:requestId', requestParamValidator, connectionsController.rejectConnectionRequest);
router.patch('/withdraw/:requestId', requestParamValidator, connectionsController.withdrawConnectionRequest);

// Remove connection
router.delete('/remove/:connectionId', connectionParamValidator, connectionsController.removeConnection);

module.exports = router;
