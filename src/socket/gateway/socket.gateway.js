const { Server } = require('socket.io');
const logger = require('../../common/logger/winston');
const { socketAuthMiddleware, socketRateLimiter } = require('../middleware/socket.middleware');
const presenceManager = require('../presence/presence.manager');
const roomManager = require('../rooms/room.manager');
const SocketSession = require('../sessions/SocketSession');

class SocketGateway {
  constructor() {
    this.io = null;
    this.heartbeatIntervalId = null;
  }

  /**
   * Initialize Socket.IO server
   */
  init(server) {
    this.io = new Server(server, {
      cors: {
        origin: '*', // Adjust for environment security needs
        methods: ['GET', 'POST']
      },
      pingTimeout: 20000,
      pingInterval: 25000
    });

    // 1. Mount auth and rate limiters
    this.io.use(socketAuthMiddleware);
    this.io.use(socketRateLimiter);

    // 2. Handle connections
    this.io.on('connection', async (socket) => {
      const userId = socket.user.id || socket.user._id;
      const socketId = socket.id;

      // Parse user-agent info if available
      const userAgentStr = socket.handshake.headers['user-agent'] || '';
      const ip = socket.handshake.address || '';
      
      const browser = this.parseBrowser(userAgentStr);
      const platform = this.parsePlatform(userAgentStr);

      logger.info(`🔌 Enterprise Socket connected: User ${userId} (${socketId}) on ${platform}/${browser}`);

      // Set user online
      await presenceManager.setUserOnline(userId, socketId, {
        device: this.getDeviceType(userAgentStr),
        platform,
        browser,
        ip
      }, this.io);

      // Join default namespaces rooms
      roomManager.joinUserRooms(socket);

      // Register notifications socket router
      try {
        require('../../modules/notifications/socket/notification.socket')(this.io, socket);
      } catch (err) {
        logger.error(`Failed mounting notification socket listeners: ${err.message}`);
      }

      // Register messaging socket router
      try {
        require('../../modules/messages/socket/message.socket')(this.io, socket);
      } catch (err) {
        logger.error(`Failed mounting messaging socket listeners: ${err.message}`);
      }

      // Register collaborations socket router
      try {
        require('../../modules/collaborations/socket/collaboration.socket')(this.io, socket);
      } catch (err) {
        logger.error(`Failed mounting collaboration socket listeners: ${err.message}`);
      }



      // Heartbeat signal from client (received every 30s)
      socket.on('heartbeat', async () => {
        await SocketSession.updateOne(
          { socketId },
          { $set: { lastHeartbeat: new Date() } }
        );
      });

      // Disconnect
      socket.on('disconnect', async (reason) => {
        logger.info(`🔌 Enterprise Socket disconnected: User ${userId} (${socketId}). Reason: ${reason}`);
        await presenceManager.setUserOffline(userId, socketId, this.io);
      });
    });

    // 3. Start Heartbeat Pruning Scheduler (runs every 30 seconds)
    this.startHeartbeatPruner();

    return this.io;
  }

  /**
   * Background pruner to clean up dead sessions that missed heartbeats
   */
  startHeartbeatPruner() {
    this.heartbeatIntervalId = setInterval(async () => {
      try {
        const threshold = new Date(Date.now() - 60000); // Missed 2 heartbeats (60s)
        const deadSessions = await SocketSession.find({
          lastHeartbeat: { $lt: threshold }
        }).lean();

        if (deadSessions.length > 0) {
          logger.info(`⚙️ Socket Heartbeat Pruner: Cleaning up ${deadSessions.length} dead socket sessions.`);
          for (const session of deadSessions) {
            await presenceManager.setUserOffline(session.userId, session.socketId, this.io);
          }
        }
      } catch (err) {
        logger.error(`Socket heartbeat pruner error: ${err.message}`);
      }
    }, 30000);
  }

  /**
   * Stop background timers on shutdown
   */
  destroy() {
    if (this.heartbeatIntervalId) {
      clearInterval(this.heartbeatIntervalId);
    }
  }

  getIO() {
    if (!this.io) {
      throw new Error('Socket.IO is not initialized yet!');
    }
    return this.io;
  }

  emitToUser(userId, event, data) {
    if (this.io) {
      this.io.to(`user:${userId}`).emit(event, data);
    }
  }

  emitToRoom(roomId, event, data) {
    if (this.io) {
      this.io.to(roomId).emit(event, data);
    }
  }

  // Parses user agent details
  parseBrowser(ua) {
    if (/chrome|crios/i.test(ua)) return 'Chrome';
    if (/firefox|fxios/i.test(ua)) return 'Firefox';
    if (/safari/i.test(ua) && !/chrome/i.test(ua)) return 'Safari';
    if (/msie|trident/i.test(ua)) return 'Internet Explorer';
    return 'Other';
  }

  parsePlatform(ua) {
    if (/windows/i.test(ua)) return 'Windows';
    if (/macintosh|mac os x/i.test(ua)) return 'macOS';
    if (/iphone|ipad|ipod/i.test(ua)) return 'iOS';
    if (/android/i.test(ua)) return 'Android';
    if (/linux/i.test(ua)) return 'Linux';
    return 'Other';
  }

  getDeviceType(ua) {
    if (/mobile|iphone|android.*mobile/i.test(ua)) return 'mobile';
    if (/ipad|tablet/i.test(ua)) return 'tablet';
    return 'desktop';
  }
}

module.exports = new SocketGateway();
