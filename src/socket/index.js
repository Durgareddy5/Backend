const socketGateway = require('./gateway/socket.gateway');
const presenceManager = require('./presence/presence.manager');

module.exports = {
  init: (server) => socketGateway.init(server),
  getIO: () => socketGateway.getIO(),
  emitToUser: (userId, event, data) => socketGateway.emitToUser(userId, event, data),
  emitToRoom: (roomId, event, data) => socketGateway.emitToRoom(roomId, event, data),
  isUserOnline: (userId) => presenceManager.isUserOnline(userId),
  destroy: () => socketGateway.destroy()
};
