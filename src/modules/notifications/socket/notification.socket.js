const logger = require('../../../common/logger/winston');

module.exports = (io, socket) => {
  const userId = socket.user?.id || socket.user?._id;

  socket.on('notification:join', () => {
    if (!userId) return;
    socket.join(`notification:${userId}`);
    logger.info(`🔔 Socket ${socket.id} joined notification room for user ${userId}`);
  });

  socket.on('notification:leave', () => {
    if (!userId) return;
    socket.leave(`notification:${userId}`);
  });
};
