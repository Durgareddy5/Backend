const messageService = require('../service/message.service');
const { uploadFileBuffer } = require('../../upload/service/cloudinary.service');
const MessageAttachment = require('../model/MessageAttachment');
const { ValidationError } = require('../../../common/errors/AppError');

class MessageController {
  /**
   * Get all active conversations for the authenticated user
   */
  async getUserConversations(req, res, next) {
    try {
      const data = await messageService.getUserConversations(req.user.id);
      res.status(200).json({
        success: true,
        message: 'Conversations retrieved successfully',
        data,
        error: null
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Get paginated messages for a conversation
   */
  async getConversationMessages(req, res, next) {
    try {
      const { limit, cursor } = req.query;
      const data = await messageService.getConversationMessages(
        req.user.id,
        req.params.conversationId,
        {
          limit: limit ? parseInt(limit, 10) : 20,
          cursor
        }
      );
      res.status(200).json({
        success: true,
        message: 'Messages retrieved successfully',
        data,
        error: null
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Send a new message
   */
  async sendMessage(req, res, next) {
    try {
      const data = await messageService.sendMessage(req.user.id, req.body);
      res.status(201).json({
        success: true,
        message: 'Message sent successfully',
        data,
        error: null
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Mark all messages in a conversation as read
   */
  async markAsRead(req, res, next) {
    try {
      const data = await messageService.markAsRead(req.user.id, req.params.conversationId);
      res.status(200).json({
        success: true,
        message: 'Messages marked as read',
        data,
        error: null
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Pin a conversation
   */
  async pinConversation(req, res, next) {
    try {
      const data = await messageService.pinConversation(req.user.id, req.params.conversationId);
      res.status(200).json({
        success: true,
        message: 'Conversation pinned successfully',
        data,
        error: null
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Unpin a conversation
   */
  async unpinConversation(req, res, next) {
    try {
      const data = await messageService.unpinConversation(req.user.id, req.params.conversationId);
      res.status(200).json({
        success: true,
        message: 'Conversation unpinned successfully',
        data,
        error: null
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Archive a conversation
   */
  async archiveConversation(req, res, next) {
    try {
      const data = await messageService.archiveConversation(req.user.id, req.params.conversationId);
      res.status(200).json({
        success: true,
        message: 'Conversation archived successfully',
        data,
        error: null
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Restore/Unarchive a conversation
   */
  async restoreConversation(req, res, next) {
    try {
      const data = await messageService.restoreConversation(req.user.id, req.params.conversationId);
      res.status(200).json({
        success: true,
        message: 'Conversation restored successfully',
        data,
        error: null
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Edit a message
   */
  async editMessage(req, res, next) {
    try {
      const { messageId, text } = req.body;
      if (!text || text.trim() === '') {
        throw new ValidationError('Message text is required to edit.');
      }
      const data = await messageService.editMessage(req.user.id, messageId, text.trim());
      res.status(200).json({
        success: true,
        message: 'Message edited successfully',
        data,
        error: null
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Delete a message
   */
  async deleteMessage(req, res, next) {
    try {
      const { messageId, deleteType } = req.body; // 'everyone' or 'me'
      const data = await messageService.deleteMessage(req.user.id, messageId, deleteType);
      res.status(200).json({
        success: true,
        message: 'Message deleted successfully',
        data,
        error: null
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Add a reaction to a message
   */
  async reactToMessage(req, res, next) {
    try {
      const { messageId, reaction } = req.body;
      const data = await messageService.reactToMessage(req.user.id, messageId, reaction);
      res.status(200).json({
        success: true,
        message: 'Reaction updated successfully',
        data,
        error: null
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Search messages across user conversations
   */
  async searchMessages(req, res, next) {
    try {
      const { q } = req.query;
      const data = await messageService.searchMessages(req.user.id, q);
      res.status(200).json({
        success: true,
        message: 'Messages search results retrieved',
        data,
        error: null
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Upload an attachment file
   */
  async uploadAttachment(req, res, next) {
    try {
      if (!req.file) {
        throw new ValidationError('No file uploaded.');
      }

      const uploaded = await uploadFileBuffer(
        req.file.buffer,
        req.file.originalname,
        req.user.id,
        'message-attachment',
        null,
        req.file.mimetype
      );

      const attachment = new MessageAttachment({
        url: uploaded.secure_url,
        publicId: uploaded.public_id,
        filename: req.file.originalname,
        fileType: req.file.mimetype,
        fileSize: req.file.size,
        uploadedBy: req.user.id
      });

      await attachment.save();

      res.status(200).json({
        success: true,
        message: 'File uploaded successfully',
        data: attachment,
        error: null
      });
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new MessageController();
