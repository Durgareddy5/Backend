const BaseRepository = require('../../../common/repository/base.repository');
const Conversation = require('../model/Conversation');
const Message = require('../model/Message');
const PinnedChat = require('../model/PinnedChat');
const ArchivedChat = require('../model/ArchivedChat');
const MessageAttachment = require('../model/MessageAttachment');
const MessageReaction = require('../model/MessageReaction');
const { isUserOnline } = require('../../../config/socket');

class MessageRepository extends BaseRepository {
  constructor() {
    super(Message);
  }

  /**
   * Find or create conversation between two users
   */
  async findOrCreateConversation(userA, userB) {
    let conv = await Conversation.findOne({
      participants: { $all: [userA, userB] }
    });
    
    if (!conv) {
      conv = new Conversation({ participants: [userA, userB] });
      await conv.save();
    }
    return conv;
  }

  /**
   * Get all conversations for a user including lastMessage, unread count, pin and archive status
   */
  async getUserConversations(userId) {
    // 1. Get pinned and archived conversation lists
    const pinnedList = await PinnedChat.find({ userId }).select('conversationId').lean();
    const archivedList = await ArchivedChat.find({ userId }).select('conversationId').lean();

    const pinnedIds = pinnedList.map(p => p.conversationId.toString());
    const archivedIds = archivedList.map(a => a.conversationId.toString());

    // 2. Fetch all conversations where user is a participant
    const conversations = await Conversation.find({
      participants: userId
    })
      .populate('participants', 'firstName lastName profileImage username')
      .populate({
        path: 'lastMessage',
        populate: { path: 'attachment' }
      })
      .sort({ lastMessageAt: -1 })
      .lean();

    // 3. Process each conversation with unread counts and tags
    const processed = await Promise.all(
      conversations.map(async (conv) => {
        const otherParticipant = conv.participants.find(
          p => p._id.toString() !== userId.toString()
        );

        // Count unread messages sent by the OTHER participant
        const unreadCount = await Message.countDocuments({
          conversationId: conv._id,
          senderId: otherParticipant ? otherParticipant._id : null,
          status: { $ne: 'seen' }
        });

        const convIdStr = conv._id.toString();

        return {
          ...conv,
          otherParticipant: otherParticipant ? {
            ...otherParticipant,
            isOnline: isUserOnline(otherParticipant._id)
          } : null,
          unreadCount,
          isPinned: pinnedIds.includes(convIdStr),
          isArchived: archivedIds.includes(convIdStr)
        };
      })
    );

    return processed;
  }

  /**
   * Get cursor paginated message history for a conversation
   */
  async getConversationMessages(conversationId, { limit = 20, cursor, userId }) {
    const query = { conversationId };

    if (cursor) {
      query._id = { $lt: cursor };
    }

    if (userId) {
      query.deletedBy = { $ne: userId };
    }

    const messages = await Message.find(query)
      .sort({ _id: -1 })
      .limit(limit + 1)
      .populate('attachment')
      .populate('replyTo')
      .lean();

    const hasNextPage = messages.length > limit;
    if (hasNextPage) {
      messages.pop(); // Remove extra record
    }

    // Retrieve reactions for these messages
    const messageIds = messages.map(m => m._id);
    const reactions = await MessageReaction.find({ messageId: { $in: messageIds } })
      .populate('userId', 'firstName lastName username')
      .lean();

    // Attach reactions to messages
    const messagesWithReactions = messages.map(m => {
      const msgReactions = reactions.filter(
        r => r.messageId.toString() === m._id.toString()
      );
      return {
        ...m,
        reactions: msgReactions
      };
    });

    // We return list in chronological order (oldest first)
    messagesWithReactions.reverse();

    return {
      docs: messagesWithReactions,
      nextCursor: hasNextPage && messages.length > 0 ? messages[0]._id : null,
      hasNextPage
    };
  }

  /**
   * Search messages in a conversation
   */
  async searchMessages(userId, queryText) {
    // Find user's conversations
    const conversations = await Conversation.find({ participants: userId }).select('_id');
    const conversationIds = conversations.map(c => c._id);

    return await Message.find({
      conversationId: { $in: conversationIds },
      text: { $regex: queryText, $options: 'i' },
      deleted: false
    })
      .populate('conversationId')
      .populate('senderId', 'firstName lastName profileImage')
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();
  }
}

module.exports = new MessageRepository();
