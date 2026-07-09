const express = require("express");
const router = express.Router();
const messageController = require("../controller/message.controller");
const {
  authMiddleware,
} = require("../../../common/middlewares/auth.middleware");
const {
  createConversationValidator,
  sendMessageValidator,
  messageQueryValidator,
} = require("../validator/message.validator");

router.use(authMiddleware);

router.post(
  "/conversations",
  createConversationValidator,
  messageController.createConversation,
);
router.get(
  "/conversations",
  messageQueryValidator,
  messageController.listConversations,
);
router.get(
  "/conversations/:conversationId/messages",
  messageQueryValidator,
  messageController.getMessages,
);
router.post(
  "/conversations/:conversationId/messages",
  sendMessageValidator,
  messageController.sendMessage,
);
router.post(
  "/conversations/:conversationId/read",
  messageController.markConversationRead,
);
router.get("/unread-count", messageController.getUnreadCount);
router.delete("/:messageId", messageController.deleteMessage);

module.exports = router;
