const Presence = require('./Presence');
const SocketSession = require('../sessions/SocketSession');
const Conversation = require('../../modules/messages/model/Conversation');
const logger = require('../../common/logger/winston');

class PresenceManager {
  /**
   * Set user online (maps new socket session)
   */
  async setUserOnline(userId, socketId, metadata = {}, io) {
    const userIdStr = userId.toString();
    
    try {
      // 1. Log socket session in database
      await SocketSession.findOneAndUpdate(
        { socketId },
        {
          socketId,
          userId: userIdStr,
          device: metadata.device || 'desktop',
          platform: metadata.platform || 'unknown',
          browser: metadata.browser || 'unknown',
          ip: metadata.ip || '127.0.0.1',
          connectedAt: new Date(),
          lastHeartbeat: new Date()
        },
        { upsert: true }
      );

      // 2. Fetch presence status and update
      const existing = await Presence.findOne({ userId: userIdStr });
      const wasOffline = !existing || existing.status === 'offline';

      await Presence.findOneAndUpdate(
        { userId: userIdStr },
        {
          userId: userIdStr,
          status: 'online',
          lastActive: new Date()
        },
        { upsert: true }
      );

      // 3. Broadcast status change to contacts if they just logged on
      if (wasOffline && io) {
        await this.broadcastPresence(userIdStr, 'online', null, io);
      }
    } catch (err) {
      logger.error(`Failed setting user online in presence manager: ${err.message}`);
    }
  }

  /**
   * Disconnects a specific socket session and sets user offline if no active sockets remain
   */
  async setUserOffline(userId, socketId, io) {
    const userIdStr = userId.toString();

    try {
      // 1. Remove socket session
      await SocketSession.deleteOne({ socketId });

      // 2. Count remaining sessions
      const sessionCount = await SocketSession.countDocuments({ userId: userIdStr });
      
      if (sessionCount === 0) {
        // User is completely disconnected across all devices
        const lastSeen = new Date();
        
        await Presence.findOneAndUpdate(
          { userId: userIdStr },
          {
            status: 'offline',
            lastSeen
          }
        );

        // Broadcast offline presence to contacts
        if (io) {
          await this.broadcastPresence(userIdStr, 'offline', lastSeen, io);
        }
      }
    } catch (err) {
      logger.error(`Failed setting user offline in presence manager: ${err.message}`);
    }
  }

  /**
   * Change user status (e.g. to idle, busy, away) manually
   */
  async setUserStatus(userId, status, io) {
    const userIdStr = userId.toString();

    try {
      await Presence.findOneAndUpdate(
        { userId: userIdStr },
        { status, lastActive: new Date() }
      );

      if (io) {
        await this.broadcastPresence(userIdStr, status, null, io);
      }
    } catch (err) {
      logger.error(`Failed changing user status in presence manager: ${err.message}`);
    }
  }

  /**
   * Broadcast presence updates to all active conversation contacts of the user
   */
  async broadcastPresence(userId, status, lastSeen, io) {
    try {
      const conversations = await Conversation.find({ participants: userId }).select('participants').lean();
      
      conversations.forEach(c => {
        const otherId = c.participants.find(p => p.toString() !== userId.toString());
        if (otherId) {
          io.to(`user:${otherId}`).emit('presence:update', {
            userId,
            status,
            lastSeen
          });
        }
      });
    } catch (err) {
      logger.error(`Failed broadcasting presence: ${err.message}`);
    }
  }

  /**
   * Read-only helper to inspect online status
   */
  async isUserOnline(userId) {
    try {
      const presence = await Presence.findOne({ userId });
      return presence ? presence.status === 'online' : false;
    } catch (err) {
      return false;
    }
  }
}

module.exports = new PresenceManager();
