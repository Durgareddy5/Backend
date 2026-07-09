const express = require('express');
const router = express.Router();
const messageController = require('../controller/message.controller');
const { authMiddleware } = require('../../../common/middlewares/auth.middleware');
const { upload, validateUpload } = require('../../upload/middleware/upload.middleware');
const {
  validateSendMessage,
  validateMessageId,
  validateReaction,
  validateConversationId
} = require('../validators/message.validator');

// All messages routes require active session auth
router.use(authMiddleware);

// GET Conversation lists & search
router.get('/', messageController.getUserConversations);
router.get('/search', messageController.searchMessages);

// GET Message history
router.get('/:conversationId', validateConversationId, messageController.getConversationMessages);

// POST Send message
router.post('/send', validateSendMessage, messageController.sendMessage);

// PATCH Mark read
router.patch('/:conversationId/read', validateConversationId, messageController.markAsRead);

// PATCH Pin / Unpin
router.patch('/:conversationId/pin', validateConversationId, messageController.pinConversation);
router.patch('/:conversationId/unpin', validateConversationId, messageController.unpinConversation);

// PATCH Archive / Unarchive
router.patch('/:conversationId/archive', validateConversationId, messageController.archiveConversation);
router.patch('/:conversationId/restore', validateConversationId, messageController.restoreConversation);

// PATCH Edit Message
router.patch('/edit', messageController.editMessage);

// DELETE Delete Message (both Everyone and Me)
router.delete('/delete', validateMessageId, messageController.deleteMessage);

// POST Reactions
router.post('/reaction', validateReaction, messageController.reactToMessage);

// POST File Attachment Upload
router.post('/upload', upload.single('file'), validateUpload, messageController.uploadAttachment);

module.exports = router;
