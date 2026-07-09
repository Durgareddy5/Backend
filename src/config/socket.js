const socketInfrastructure = require('../socket');

module.exports = {
  initSocket: (server) => socketInfrastructure.init(server),
  getIO: () => socketInfrastructure.getIO(),
  emitToUser: (userId, event, data) => socketInfrastructure.emitToUser(userId, event, data),
  emitToRoom: (roomId, event, data) => socketInfrastructure.emitToRoom(roomId, event, data),
  isUserOnline: (userId) => socketInfrastructure.isUserOnline(userId)
};
