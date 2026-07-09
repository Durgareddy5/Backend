const logger = require('../../common/logger/winston');

class RoomManager {
  /**
   * Automatically joins user to default rooms (user, notifications, connections channels)
   */
  joinUserRooms(socket) {
    const userId = socket.user.id || socket.user._id;
    if (!userId) return;

    const rooms = [
      `user:${userId}`,
      `notification:${userId}`,
      `connection:${userId}`
    ];

    rooms.forEach((room) => {
      socket.join(room);
      logger.info(`🏠 Socket ${socket.id} joined personal room: ${room}`);
    });
  }

  /**
   * Joins socket connection to conversation room
   */
  joinConversation(socket, conversationId) {
    if (!conversationId) return;
    const roomId = `conversation:${conversationId}`;
    socket.join(roomId);
    logger.info(`💬 Socket ${socket.id} joined conversation room: ${roomId}`);
  }

  /**
   * Leaves socket connection from conversation room
   */
  leaveConversation(socket, conversationId) {
    if (!conversationId) return;
    const roomId = `conversation:${conversationId}`;
    socket.leave(roomId);
    logger.info(`💬 Socket ${socket.id} left conversation room: ${roomId}`);
  }
}

module.exports = new RoomManager();
