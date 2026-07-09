const mongoose = require('mongoose');

const archivedChatSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    conversationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Conversation',
      required: true,
      index: true
    }
  },
  {
    timestamps: true
  }
);

archivedChatSchema.index({ userId: 1, conversationId: 1 }, { unique: true });

module.exports = mongoose.model('ArchivedChat', archivedChatSchema);
