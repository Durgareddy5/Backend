const logger = require('../../../common/logger/winston');
const CollaborationMessage = require('../model/CollaborationMessage');
const User = require('../../../models/User');

module.exports = (io, socket) => {
  /**
   * join workspace room
   */
  socket.on('workspace:join', ({ collaborationId }) => {
    if (!collaborationId) return;
    const room = `collaboration:${collaborationId}`;
    socket.join(room);
    logger.info(`🔌 User ${socket.user?.id} joined workspace room: ${room}`);
  });

  /**
   * leave workspace room
   */
  socket.on('workspace:leave', ({ collaborationId }) => {
    if (!collaborationId) return;
    const room = `collaboration:${collaborationId}`;
    socket.leave(room);
    logger.info(`🔌 User ${socket.user?.id} left workspace room: ${room}`);
  });

  /**
   * send real-time workspace message
   */
  socket.on('workspace:message', async ({ collaborationId, text, attachments = [] }) => {
    if (!collaborationId || !text) return;
    
    const senderId = socket.user?.id || socket.user?._id;
    const room = `collaboration:${collaborationId}`;

    try {
      // 1. Save message to DB
      const message = await CollaborationMessage.create({
        collaborationId,
        senderId,
        text,
        attachments
      });

      // 2. Fetch sender details
      const sender = await User.findById(senderId)
        .select('firstName lastName avatar')
        .lean();

      // 3. Broadcast to workspace room
      io.to(room).emit('workspace:message', {
        ...message.toJSON(),
        senderId: sender
      });

    } catch (err) {
      logger.error(`Failed handling workspace:message socket event: ${err.message}`);
    }
  });

  /**
   * typing indicators
   */
  socket.on('workspace:typing', ({ collaborationId }) => {
    if (!collaborationId) return;
    socket.to(`collaboration:${collaborationId}`).emit('workspace:typing', {
      userId: socket.user?.id,
      username: socket.user?.username
    });
  });

  socket.on('workspace:stopTyping', ({ collaborationId }) => {
    if (!collaborationId) return;
    socket.to(`collaboration:${collaborationId}`).emit('workspace:stopTyping', {
      userId: socket.user?.id
    });
  });
};
