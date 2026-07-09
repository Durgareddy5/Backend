const messageRoutes = require("./routes/message.routes");
const messageController = require("./controller/message.controller");
const messageService = require("./service/message.service");
const conversationRepository = require("./repository/conversation.repository");
const messageRepository = require("./repository/message.repository");

module.exports = {
  routes: messageRoutes,
  controller: messageController,
  service: messageService,
  conversationRepository,
  messageRepository,
};
