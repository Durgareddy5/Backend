const messageService = require('../service/message.service');
const logger = require('../../../common/logger/winston');

module.exports = (io, socket) => {
  const userId = socket.user.id || socket.user._id;

  /**
   * Listen for user joining conversation room
   */
  socket.on('chat:join', ({ conversationId }) => {
    if (!conversationId) return;
    const roomId = `conversation:${conversationId}`;
    socket.join(roomId);
    logger.info(`💬 Socket ${socket.id} (User: ${userId}) joined room: ${roomId}`);
  });

  /**
   * Listen for user leaving conversation room
   */
  socket.on('chat:leave', ({ conversationId }) => {
    if (!conversationId) return;
    const roomId = `conversation:${conversationId}`;
    socket.leave(roomId);
    logger.info(`💬 Socket ${socket.id} (User: ${userId}) left room: ${roomId}`);
  });

  /**
   * Listen for user typing
   */
  socket.on('chat:typing', ({ conversationId }) => {
    if (!conversationId) return;
    socket.to(`conversation:${conversationId}`).emit('typing:start', {
      conversationId,
      userId
    });
  });

  /**
   * Listen for user stop typing
   */
  socket.on('chat:stopTyping', ({ conversationId }) => {
    if (!conversationId) return;
    socket.to(`conversation:${conversationId}`).emit('typing:stop', {
      conversationId,
      userId
    });
  });

  /**
   * Listen for chat read receipts
   */
  socket.on('chat:read', async ({ conversationId }) => {
    if (!conversationId) return;
    try {
      await messageService.markAsRead(userId, conversationId);
    } catch (err) {
      logger.error(`Error marking message as read via socket: ${err.message}`);
    }
  });
};
