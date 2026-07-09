const Connection = require('../../../models/Connection');
const { ValidationError, UnauthorizedError } = require('../../../common/errors/AppError');
const messageRepository = require('../repository/message.repository');
const Conversation = require('../model/Conversation');
const Message = require('../model/Message');
const PinnedChat = require('../model/PinnedChat');
const ArchivedChat = require('../model/ArchivedChat');
const MessageAttachment = require('../model/MessageAttachment');
const MessageReaction = require('../model/MessageReaction');
const { emitToUser, emitToRoom } = require('../../../config/socket');

class MessageService {
  /**
   * Helper to verify if two users are currently connected
   */
  async checkConnected(userA, userB) {
    const [a, b] = [userA.toString(), userB.toString()].sort();
    const conn = await Connection.findOne({ researcherA: a, researcherB: b });
    return !!conn;
  }

  /**
   * Start or retrieve a conversation
   */
  async getOrCreateConversation(userId, targetUserId) {
    if (userId.toString() === targetUserId.toString()) {
      throw new ValidationError('Cannot chat with yourself.');
    }

    // Enforce connection check
    const isConnected = await this.checkConnected(userId, targetUserId);
    if (!isConnected) {
      throw new ValidationError('You can only message connected researchers.');
    }

    return await messageRepository.findOrCreateConversation(userId, targetUserId);
  }

  /**
   * Send a new message
   */
  async sendMessage(userId, { conversationId, receiverId, type = 'text', text, attachmentId, replyTo }) {
    let conv;
    if (conversationId) {
      conv = await Conversation.findById(conversationId);
      if (!conv) {
        throw new ValidationError('Conversation not found.');
      }
      if (!conv.participants.map(p => p.toString()).includes(userId.toString())) {
        throw new UnauthorizedError('Unauthorized access to this conversation.');
      }
      receiverId = conv.participants.find(p => p.toString() !== userId.toString());
    } else if (receiverId) {
      conv = await this.getOrCreateConversation(userId, receiverId);
      conversationId = conv._id;
    } else {
      throw new ValidationError('Either conversationId or receiverId must be supplied.');
    }

    // Double check connection status
    const isConnected = await this.checkConnected(userId, receiverId);
    if (!isConnected) {
      throw new ValidationError('You can only message connected researchers.');
    }

    // Create the message
    const message = new Message({
      conversationId,
      senderId: userId,
      receiverId,
      type,
      text,
      attachment: attachmentId || null,
      replyTo: replyTo || null,
      status: 'sent'
    });

    await message.save();

    // Populate attachment details if it exists
    if (attachmentId) {
      await MessageAttachment.findByIdAndUpdate(attachmentId, { messageId: message._id });
    }

    // Update conversation metadata
    await Conversation.findByIdAndUpdate(conversationId, {
      lastMessage: message._id,
      lastMessageAt: message.createdAt
    });

    const populated = await Message.findById(message._id)
      .populate('attachment')
      .populate('replyTo')
      .lean();

    // Emit live events to both users
    // 1. Emit new message event to the conversation room
    emitToRoom(`conversation:${conversationId}`, 'message:new', populated);
    
    // 2. Emit conversation updates to both participants' user rooms to refresh sidebars
    emitToUser(userId, 'conversation:update', { conversationId, lastMessage: populated });
    emitToUser(receiverId, 'conversation:update', { conversationId, lastMessage: populated });

    return populated;
  }

  /**
   * Get all conversations of a user
   */
  async getUserConversations(userId) {
    return await messageRepository.getUserConversations(userId);
  }

  /**
   * Get messages of a conversation with cursor pagination
   */
  async getConversationMessages(userId, conversationId, { limit, cursor }) {
    const conv = await Conversation.findById(conversationId);
    if (!conv) {
      throw new ValidationError('Conversation not found.');
    }
    if (!conv.participants.map(p => p.toString()).includes(userId.toString())) {
      throw new UnauthorizedError('Unauthorized access to this conversation.');
    }

    return await messageRepository.getConversationMessages(conversationId, { limit, cursor, userId });
  }

  /**
   * Mark all messages in a conversation as read by the user
   */
  async markAsRead(userId, conversationId) {
    const conv = await Conversation.findById(conversationId);
    if (!conv) {
      throw new ValidationError('Conversation not found.');
    }
    if (!conv.participants.map(p => p.toString()).includes(userId.toString())) {
      throw new UnauthorizedError('Unauthorized access.');
    }

    const otherParticipantId = conv.participants.find(p => p.toString() !== userId.toString());

    // Update message status to seen for all incoming messages
    await Message.updateMany(
      { conversationId, senderId: otherParticipantId, status: { $ne: 'seen' } },
      { $set: { status: 'seen' } }
    );

    // Notify the sender that messages were read
    emitToUser(otherParticipantId, 'message:read', { conversationId, readBy: userId });

    return { success: true };
  }

  /**
   * Pin a conversation
   */
  async pinConversation(userId, conversationId) {
    const count = await PinnedChat.countDocuments({ userId });
    if (count >= 10) {
      throw new ValidationError('You can pin a maximum of 10 conversations.');
    }

    await PinnedChat.findOneAndUpdate(
      { userId, conversationId },
      { userId, conversationId },
      { upsert: true }
    );

    return { success: true };
  }

  /**
   * Unpin a conversation
   */
  async unpinConversation(userId, conversationId) {
    await PinnedChat.deleteOne({ userId, conversationId });
    return { success: true };
  }

  /**
   * Archive a conversation
   */
  async archiveConversation(userId, conversationId) {
    await ArchivedChat.findOneAndUpdate(
      { userId, conversationId },
      { userId, conversationId },
      { upsert: true }
    );

    return { success: true };
  }

  /**
   * Restore/Unarchive a conversation
   */
  async restoreConversation(userId, conversationId) {
    await ArchivedChat.deleteOne({ userId, conversationId });
    return { success: true };
  }

  /**
   * Edit a message
   */
  async editMessage(userId, messageId, text) {
    const msg = await Message.findById(messageId);
    if (!msg) {
      throw new ValidationError('Message not found.');
    }
    if (msg.senderId.toString() !== userId.toString()) {
      throw new UnauthorizedError('Cannot edit messages sent by another researcher.');
    }
    if (msg.deleted) {
      throw new ValidationError('Cannot edit a deleted message.');
    }

    msg.text = text;
    msg.edited = true;
    await msg.save();

    const populated = await Message.findById(messageId)
      .populate('attachment')
      .populate('replyTo')
      .lean();

    emitToRoom(`conversation:${msg.conversationId}`, 'message:update', populated);

    return populated;
  }

  /**
   * Delete a message
   */
  async deleteMessage(userId, messageId, deleteType = 'everyone') {
    const msg = await Message.findById(messageId);
    if (!msg) {
      throw new ValidationError('Message not found.');
    }

    if (deleteType === 'everyone') {
      if (msg.senderId.toString() !== userId.toString()) {
        throw new UnauthorizedError('Cannot delete messages sent by another researcher.');
      }
      msg.deleted = true;
      msg.text = 'This message was deleted';
      msg.attachment = null;
      await msg.save();

      const populated = await Message.findById(messageId)
        .populate('attachment')
        .populate('replyTo')
        .lean();

      emitToRoom(`conversation:${msg.conversationId}`, 'message:update', populated);
    } else {
      // Delete for me
      if (!msg.deletedBy.map(d => d.toString()).includes(userId.toString())) {
        msg.deletedBy.push(userId);
        await msg.save();
      }
    }

    return { success: true };
  }

  /**
   * Add / update a reaction on a message
   */
  async reactToMessage(userId, messageId, reaction) {
    const msg = await Message.findById(messageId);
    if (!msg) {
      throw new ValidationError('Message not found.');
    }

    await MessageReaction.findOneAndUpdate(
      { messageId, userId },
      { messageId, userId, reaction },
      { upsert: true }
    );

    const populated = await Message.findById(messageId)
      .populate('attachment')
      .populate('replyTo')
      .lean();

    // Fetch reactions count
    const reactions = await MessageReaction.find({ messageId })
      .populate('userId', 'firstName lastName username')
      .lean();

    const updatePayload = {
      ...populated,
      reactions
    };

    emitToRoom(`conversation:${msg.conversationId}`, 'message:update', updatePayload);

    return updatePayload;
  }

  /**
   * Search messages
   */
  async searchMessages(userId, query) {
    if (!query || query.trim() === '') {
      throw new ValidationError('Search query must be supplied.');
    }
    return await messageRepository.searchMessages(userId, query.trim());
  }
}

module.exports = new MessageService();
