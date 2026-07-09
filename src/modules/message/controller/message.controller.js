const messageService = require("../service/message.service");
const asyncHandler = require("../../../common/middlewares/asyncHandler.middleware");

class MessageController {
  createConversation = asyncHandler(async (req, res) => {
    const conversation = await messageService.createConversation(
      req.user._id,
      req.body.participantId,
    );
    return res.success("Conversation created successfully.", conversation);
  });

  listConversations = asyncHandler(async (req, res) => {
    const conversations = await messageService.listConversations(
      req.user._id,
      req.query,
    );
    return res.success("Conversations retrieved successfully.", conversations);
  });

  getMessages = asyncHandler(async (req, res) => {
    const messages = await messageService.getMessages(
      req.params.conversationId,
      req.user._id,
      req.query,
    );
    return res.success("Messages retrieved successfully.", messages);
  });

  sendMessage = asyncHandler(async (req, res) => {
    const message = await messageService.sendMessage(
      req.user._id,
      req.params.conversationId,
      req.body,
    );
    return res.success("Message sent successfully.", message);
  });

  markConversationRead = asyncHandler(async (req, res) => {
    const result = await messageService.markConversationRead(
      req.user._id,
      req.params.conversationId,
    );
    return res.success("Conversation marked as read.", result);
  });

  getUnreadCount = asyncHandler(async (req, res) => {
    const result = await messageService.getUnreadCount(req.user._id);
    return res.success("Unread count retrieved successfully.", result);
  });

  deleteMessage = asyncHandler(async (req, res) => {
    const message = await messageService.deleteMessage(
      req.user._id,
      req.params.messageId,
    );
    return res.success("Message deleted successfully.", message);
  });
}

module.exports = new MessageController();
