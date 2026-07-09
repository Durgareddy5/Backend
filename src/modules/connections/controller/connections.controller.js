const connectionsService = require('../service/connections.service');
const asyncHandler = require('../../../common/middlewares/asyncHandler.middleware');

class ConnectionsController {
  // Send connection request
  sendConnectionRequest = asyncHandler(async (req, res) => {
    const { researcherId } = req.params;
    const { note } = req.body;
    const request = await connectionsService.sendRequest(req.user._id, researcherId, note);
    return res.success('Connection request sent successfully.', request);
  });

  // Accept connection request
  acceptConnectionRequest = asyncHandler(async (req, res) => {
    const { requestId } = req.params;
    const result = await connectionsService.acceptRequest(requestId, req.user._id);
    return res.success('Connection request accepted successfully.', result);
  });

  // Reject connection request
  rejectConnectionRequest = asyncHandler(async (req, res) => {
    const { requestId } = req.params;
    const result = await connectionsService.rejectRequest(requestId, req.user._id);
    return res.success('Connection request rejected / ignored successfully.', result);
  });

  // Withdraw connection request
  withdrawConnectionRequest = asyncHandler(async (req, res) => {
    const { requestId } = req.params;
    const result = await connectionsService.withdrawRequest(requestId, req.user._id);
    return res.success('Connection request withdrawn successfully.', result);
  });

  // Remove connection
  removeConnection = asyncHandler(async (req, res) => {
    const { connectionId } = req.params;
    const result = await connectionsService.removeConnection(connectionId, req.user._id);
    return res.success('Connection removed successfully.', result);
  });

  // Get connections list
  getConnections = asyncHandler(async (req, res) => {
    const { limit = 10, cursor, search = '' } = req.query;
    const connections = await connectionsService.getConnections(req.user._id, { 
      limit: Number(limit), 
      cursor, 
      search 
    });
    return res.success('Connections list retrieved successfully.', connections);
  });

  // Get received pending requests
  getReceivedRequests = asyncHandler(async (req, res) => {
    const requests = await connectionsService.getReceivedRequests(req.user._id);
    return res.success('Received connection requests retrieved successfully.', requests);
  });

  // Get sent pending requests
  getSentRequests = asyncHandler(async (req, res) => {
    const requests = await connectionsService.getSentRequests(req.user._id);
    return res.success('Sent connection requests retrieved successfully.', requests);
  });

  // Get connection status with researcher
  getConnectionStatus = asyncHandler(async (req, res) => {
    const { researcherId } = req.params;
    const status = await connectionsService.getConnectionStatus(req.user._id, researcherId);
    return res.success('Connection status retrieved successfully.', status);
  });
}

module.exports = new ConnectionsController();
