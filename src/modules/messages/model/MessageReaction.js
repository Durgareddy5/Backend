const mongoose = require('mongoose');

const messageReactionSchema = new mongoose.Schema(
  {
    messageId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Message',
      required: true,
      index: true
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    reaction: {
      type: String,
      required: true
    }
  },
  {
    timestamps: true
  }
);

// Enforce unique reaction per user per message
messageReactionSchema.index({ messageId: 1, userId: 1 }, { unique: true });

module.exports = mongoose.model('MessageReaction', messageReactionSchema);
