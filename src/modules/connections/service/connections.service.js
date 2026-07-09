const connectionsRepository = require('../repository/connections.repository');
const ConnectionRequest = require('../model/ConnectionRequest');
const Connection = require('../model/Connection');
const User = require('../../../models/User');
const Profile = require('../../../models/Profile');
const { ProfileCache } = require('../../../cache/cache.service');
const { NotFoundError, ValidationError, ConflictError, UnauthorizedError } = require('../../../common/errors/AppError');
const mongoose = require('mongoose');

class ConnectionsService {
  /**
   * Helper to sort user IDs to ensure researcherA < researcherB
   */
  _sortUserIds(userIdA, userIdB) {
    const idAStr = userIdA.toString();
    const idBStr = userIdB.toString();
    return idAStr < idBStr 
      ? [userIdA, userIdB] 
      : [userIdB, userIdA];
  }

  /**
   * Send a connection request to a researcher
   */
  async sendRequest(senderId, targetUserId, note = '') {
    if (senderId.toString() === targetUserId.toString()) {
      throw new ValidationError('You cannot connect to yourself.');
    }

    if (note && note.length > 300) {
      throw new ValidationError('Connection note cannot exceed 300 characters.');
    }

    // Verify target researcher exists
    const targetUser = await User.findOne({ _id: targetUserId, isDeleted: { $ne: true } });
    if (!targetUser) {
      throw new NotFoundError('Researcher not found.');
    }

    // 1. Check if already connected
    const existingConnection = await connectionsRepository.findConnection(senderId, targetUserId);
    if (existingConnection) {
      throw new ConflictError('You are already connected to this researcher.');
    }

    // 2. Check if a pending request exists
    const request = await connectionsRepository.findConnectionRequest(senderId, targetUserId);
    if (request && request.status === 'pending') {
      if (request.senderId.toString() === senderId.toString()) {
        throw new ConflictError('A connection request is already pending.');
      } else {
        // OPPOSITE REQUEST EXISTS!
        // "If request exists in opposite direction: Automatically show Accept instead of Send."
        // We will automatically accept the request and establish connection.
        return await this.acceptRequest(request._id, senderId);
      }
    }

    // If an inactive request exists, we can reset/update it or delete and recreate
    if (request) {
      await ConnectionRequest.deleteOne({ _id: request._id });
    }

    // Create Connection Request
    const requestDoc = await ConnectionRequest.create({
      senderId,
      receiverId: targetUserId,
      note,
      status: 'pending'
    });

    // Update pending counts in Profiles
    await Promise.all([
      Profile.findOneAndUpdate({ userId: senderId }, { $inc: { pendingSentCount: 1 } }, { upsert: true, new: true }),
      Profile.findOneAndUpdate({ userId: targetUserId }, { $inc: { pendingReceivedCount: 1 } }, { upsert: true, new: true })
    ]);

    // Invalidate profile cache
    await Promise.all([
      ProfileCache.del(senderId.toString()),
      ProfileCache.del(targetUserId.toString())
    ]);

    // Send Real-Time Notification
    const senderUser = await User.findById(senderId).select('firstName lastName username').lean();
    if (senderUser) {
      const sName = `${senderUser.firstName} ${senderUser.lastName}`;
      const notificationService = require('../../notifications/service/notification.service');
      await notificationService.createNotification({
        recipientId: targetUserId,
        actorId: senderId,
        type: 'connection_request',
        title: 'Connection Request Received',
        message: `${sName} sent you a connection request.`,
        targetType: 'ConnectionRequest',
        targetId: requestDoc._id,
        targetUrl: '/network/invitations'
      }).catch(err => console.error(`Failed to create connection request notification: ${err.message}`));
    }

    return requestDoc;
  }

  /**
   * Accept a connection request
   */
  async acceptRequest(requestId, receiverId) {
    const request = await ConnectionRequest.findById(requestId);
    if (!request) {
      throw new NotFoundError('Connection request not found.');
    }

    if (request.receiverId.toString() !== receiverId.toString()) {
      throw new UnauthorizedError('You are not authorized to accept this request.');
    }

    if (request.status !== 'pending') {
      throw new ValidationError(`Cannot accept request in '${request.status}' state.`);
    }

    // Create Connection
    const [researcherA, researcherB] = this._sortUserIds(request.senderId, request.receiverId);
    
    // Safeguard to check if connection exists due to concurrent updates
    let connectionDoc = await Connection.findOne({ researcherA, researcherB });
    if (!connectionDoc) {
      connectionDoc = await Connection.create({
        researcherA,
        researcherB,
        connectedAt: new Date()
      });

      // Update Profile counts: Increment connectionsCount, Decrement pending counts
      await Promise.all([
        Profile.findOneAndUpdate(
          { userId: request.senderId }, 
          { $inc: { connectionsCount: 1, pendingSentCount: -1 } }, 
          { upsert: true }
        ),
        Profile.findOneAndUpdate(
          { userId: request.receiverId }, 
          { $inc: { connectionsCount: 1, pendingReceivedCount: -1 } }, 
          { upsert: true }
        )
      ]);
    }

    // Delete Pending Request from DB
    await ConnectionRequest.deleteOne({ _id: requestId });

    // Invalidate profile cache
    await Promise.all([
      ProfileCache.del(request.senderId.toString()),
      ProfileCache.del(request.receiverId.toString())
    ]);

    // Send Real-Time Notification
    const receiverUser = await User.findById(receiverId).select('firstName lastName username').lean();
    if (receiverUser) {
      const rName = `${receiverUser.firstName} ${receiverUser.lastName}`;
      const notificationService = require('../../notifications/service/notification.service');
      await notificationService.createNotification({
        recipientId: request.senderId,
        actorId: receiverId,
        type: 'connection_accepted',
        title: 'Connection Request Accepted',
        message: `${rName} accepted your connection request.`,
        targetType: 'User',
        targetId: receiverId,
        targetUrl: `/profile/${receiverUser.username}`
      }).catch(err => console.error(`Failed to create connection accepted notification: ${err.message}`));
    }

    const acceptedRequestRepresentation = { ...request.toObject(), status: 'accepted' };
    return { request: acceptedRequestRepresentation, connection: connectionDoc };
  }

  /**
   * Reject a connection request
   */
  async rejectRequest(requestId, receiverId) {
    const request = await ConnectionRequest.findById(requestId);
    if (!request) {
      throw new NotFoundError('Connection request not found.');
    }

    if (request.receiverId.toString() !== receiverId.toString()) {
      throw new UnauthorizedError('You are not authorized to reject this request.');
    }

    if (request.status !== 'pending') {
      throw new ValidationError(`Cannot reject request in '${request.status}' state.`);
    }

    request.status = 'rejected';
    await request.save();

    // Decrement pending counts
    await Promise.all([
      Profile.findOneAndUpdate({ userId: request.senderId, pendingSentCount: { $gt: 0 } }, { $inc: { pendingSentCount: -1 } }),
      Profile.findOneAndUpdate({ userId: request.receiverId, pendingReceivedCount: { $gt: 0 } }, { $inc: { pendingReceivedCount: -1 } })
    ]);

    // Invalidate profile cache
    await Promise.all([
      ProfileCache.del(request.senderId.toString()),
      ProfileCache.del(request.receiverId.toString())
    ]);

    // Send Real-Time Notification
    const receiverUser = await User.findById(receiverId).select('firstName lastName username').lean();
    if (receiverUser) {
      const rName = `${receiverUser.firstName} ${receiverUser.lastName}`;
      const notificationService = require('../../notifications/service/notification.service');
      await notificationService.createNotification({
        recipientId: request.senderId,
        actorId: receiverId,
        type: 'connection_rejected',
        title: 'Connection Request Ignored',
        message: `${rName} ignored your connection request.`,
        targetType: 'User',
        targetId: receiverId,
        targetUrl: `/profile/${receiverUser.username}`
      }).catch(err => console.error(`Failed to create connection rejected notification: ${err.message}`));
    }

    return request;
  }

  /**
   * Withdraw a sent connection request
   */
  async withdrawRequest(requestId, senderId) {
    const request = await ConnectionRequest.findById(requestId);
    if (!request) {
      throw new NotFoundError('Connection request not found.');
    }

    if (request.senderId.toString() !== senderId.toString()) {
      throw new UnauthorizedError('You are not authorized to withdraw this request.');
    }

    if (request.status !== 'pending') {
      throw new ValidationError(`Cannot withdraw request in '${request.status}' state.`);
    }

    request.status = 'withdrawn';
    await request.save();

    // Decrement pending counts
    await Promise.all([
      Profile.findOneAndUpdate({ userId: request.senderId, pendingSentCount: { $gt: 0 } }, { $inc: { pendingSentCount: -1 } }),
      Profile.findOneAndUpdate({ userId: request.receiverId, pendingReceivedCount: { $gt: 0 } }, { $inc: { pendingReceivedCount: -1 } })
    ]);

    // Invalidate profile cache
    await Promise.all([
      ProfileCache.del(request.senderId.toString()),
      ProfileCache.del(request.receiverId.toString())
    ]);

    return request;
  }

  /**
   * Remove a connection
   */
  async removeConnection(connectionId, userId) {
    const connection = await Connection.findById(connectionId);
    if (!connection) {
      throw new NotFoundError('Connection not found.');
    }

    const isAuthorized = connection.researcherA.toString() === userId.toString() || 
                         connection.researcherB.toString() === userId.toString();
    if (!isAuthorized) {
      throw new UnauthorizedError('You are not authorized to remove this connection.');
    }

    // Delete Connection
    await Connection.deleteOne({ _id: connection._id });

    // Decrement connectionsCount in both profiles
    await Promise.all([
      Profile.findOneAndUpdate({ userId: connection.researcherA, connectionsCount: { $gt: 0 } }, { $inc: { connectionsCount: -1 } }),
      Profile.findOneAndUpdate({ userId: connection.researcherB, connectionsCount: { $gt: 0 } }, { $inc: { connectionsCount: -1 } })
    ]);

    // Invalidate profile cache
    await Promise.all([
      ProfileCache.del(connection.researcherA.toString()),
      ProfileCache.del(connection.researcherB.toString())
    ]);

    // Send Real-Time Notification
    const otherUser = connection.researcherA.toString() === userId.toString() ? connection.researcherB : connection.researcherA;
    const actorUser = await User.findById(userId).select('firstName lastName username').lean();
    if (actorUser) {
      const aName = `${actorUser.firstName} ${actorUser.lastName}`;
      const notificationService = require('../../notifications/service/notification.service');
      await notificationService.createNotification({
        recipientId: otherUser,
        actorId: userId,
        type: 'connection_removed',
        title: 'Connection Removed',
        message: `${aName} removed their connection with you.`,
        targetType: 'User',
        targetId: userId,
        targetUrl: `/profile/${actorUser.username}`
      }).catch(err => console.error(`Failed to create connection removed notification: ${err.message}`));
    }

    return { success: true };
  }

  /**
   * Get connections list
   */
  async getConnections(userId, queryOptions) {
    return await connectionsRepository.findConnections(userId, queryOptions);
  }

  /**
   * Get received pending requests
   */
  async getReceivedRequests(userId) {
    return await connectionsRepository.findReceivedRequests(userId);
  }

  /**
   * Get sent pending requests
   */
  async getSentRequests(userId) {
    return await connectionsRepository.findSentRequests(userId);
  }

  /**
   * Get mutual connections list
   */
  async getMutualConnectionsIds(userIdA, userIdB) {
    const [connsA, connsB] = await Promise.all([
      Connection.find({ $or: [{ researcherA: userIdA }, { researcherB: userIdA }] }).lean(),
      Connection.find({ $or: [{ researcherA: userIdB }, { researcherB: userIdB }] }).lean()
    ]);

    const idsA = connsA.map(c => c.researcherA.toString() === userIdA.toString() ? c.researcherB.toString() : c.researcherA.toString());
    const idsB = connsB.map(c => c.researcherA.toString() === userIdB.toString() ? c.researcherB.toString() : c.researcherA.toString());

    return idsA.filter(id => idsB.includes(id));
  }

  /**
   * Get connection status between current user and target user
   */
  async getConnectionStatus(currentUserId, targetUserId) {
    const targetUser = await User.findOne({ _id: targetUserId, isDeleted: { $ne: true } }).lean();
    if (!targetUser) {
      throw new NotFoundError('Target researcher not found.');
    }

    const [connection, pendingRequest, targetProfile, mutualIds] = await Promise.all([
      connectionsRepository.findConnection(currentUserId, targetUserId),
      connectionsRepository.findConnectionRequest(currentUserId, targetUserId),
      Profile.findOne({ userId: targetUserId }).lean(),
      this.getMutualConnectionsIds(currentUserId, targetUserId)
    ]);

    let status = 'none';
    let requestId = null;
    let connectionId = null;
    let note = '';

    if (connection) {
      status = 'connected';
      connectionId = connection._id;
    } else if (pendingRequest && pendingRequest.status === 'pending') {
      if (pendingRequest.senderId.toString() === currentUserId.toString()) {
        status = 'pending_sent';
      } else {
        status = 'pending_received';
        note = pendingRequest.note;
      }
      requestId = pendingRequest._id;
    }

    return {
      status,
      requestId,
      connectionId,
      note,
      connectionsCount: targetProfile?.connectionsCount || 0,
      mutualConnectionsCount: mutualIds.length
    };
  }
}

module.exports = new ConnectionsService();
