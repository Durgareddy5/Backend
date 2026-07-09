const { BaseService } = require("../../../common/service");
const conversationRepository = require("../repository/conversation.repository");
const messageRepository = require("../repository/message.repository");
const {
  ValidationError,
  NotFoundError,
  ForbiddenError,
} = require("../../../common/errors/AppError");
const logger = require("../../../common/logger/winston");

class MessageService extends BaseService {
  constructor() {
    super(messageRepository);
    this.conversationRepository = conversationRepository;
    this.messageRepository = messageRepository;
  }

  async createConversation(userId, participantId) {
    if (!participantId) {
      throw new ValidationError("Participant ID is required.");
    }

    if (participantId.toString() === userId.toString()) {
      throw new ValidationError(
        "You cannot start a conversation with yourself.",
      );
    }

    const existingConversation = await this.conversationRepository.findOne({
      type: "direct",
      participants: { $all: [userId, participantId], $size: 2 },
      isDeleted: { $ne: true },
    });

    if (existingConversation) {
      return existingConversation;
    }

    const conversation = await this.conversationRepository.create({
      participants: [userId, participantId],
      type: "direct",
    });

    logger.info(`Conversation created between ${userId} and ${participantId}`);
    return conversation;
  }

  async listConversations(userId, queryOptions = {}) {
    return await this.conversationRepository.find(
      { participants: userId, isDeleted: { $ne: true } },
      queryOptions,
      "participants lastMessage",
    );
  }

  async getMessages(conversationId, userId, queryOptions = {}) {
    const conversation = await this.conversationRepository.findOne({
      _id: conversationId,
      participants: userId,
      isDeleted: { $ne: true },
    });

    if (!conversation) {
      throw new NotFoundError("Conversation not found.");
    }

    return await this.messageRepository.find(
      { conversationId, isDeleted: { $ne: true } },
      queryOptions,
      "sender recipient",
    );
  }

  async sendMessage(userId, conversationId, payload) {
    const conversation = await this.conversationRepository.findOne({
      _id: conversationId,
      participants: userId,
      isDeleted: { $ne: true },
    });

    if (!conversation) {
      throw new ForbiddenError(
        "You are not allowed to send messages in this conversation.",
      );
    }

    const content = payload.content || payload.message || "";
    if (!content || !content.trim()) {
      throw new ValidationError("Message content is required.");
    }

    const recipientId = conversation.participants.find(
      (participant) => participant.toString() !== userId.toString(),
    );

    const message = await this.messageRepository.create({
      conversationId,
      sender: userId,
      recipient: recipientId,
      content: content.trim(),
      type: payload.type || "text",
      attachments: payload.attachments || [],
    });

    await this.conversationRepository.update(conversationId, {
      lastMessage: message._id,
      lastMessageAt: new Date(),
    });

    logger.info(`Message sent in conversation ${conversationId} by ${userId}`);
    return message;
  }

  async markConversationRead(userId, conversationId) {
    const conversation = await this.conversationRepository.findOne({
      _id: conversationId,
      participants: userId,
      isDeleted: { $ne: true },
    });

    if (!conversation) {
      throw new NotFoundError("Conversation not found.");
    }

    await this.messageRepository.updateMany(
      {
        conversationId,
        sender: { $ne: userId },
        readBy: { $ne: userId },
        isDeleted: { $ne: true },
      },
      { $addToSet: { readBy: userId } },
    );

    return { success: true };
  }

  async getUnreadCount(userId) {
    const count = await this.messageRepository.count({
      sender: { $ne: userId },
      readBy: { $ne: userId },
      isDeleted: { $ne: true },
    });

    return { unreadCount: count };
  }

  async deleteMessage(userId, messageId) {
    const message = await this.messageRepository.findOne({
      _id: messageId,
      sender: userId,
      isDeleted: { $ne: true },
    });

    if (!message) {
      throw new NotFoundError("Message not found.");
    }

    return await this.messageRepository.update(messageId, {
      isDeleted: true,
      deletedAt: new Date(),
      deletedBy: userId,
    });
  }
}

module.exports = new MessageService();
