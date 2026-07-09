const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const FeedInteractionSchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    publicationId: {
      type: Schema.Types.ObjectId,
      ref: 'Publication',
      required: true,
      index: true
    },
    interactionType: {
      type: String,
      enum: ['impression', 'click', 'read_more', 'ai_summary', 'ai_explain', 'like', 'bookmark', 'comment', 'share'],
      required: true
    },
    duration: {
      type: Number,
      default: 0 // Duration in milliseconds
    }
  },
  {
    timestamps: true
  }
);

FeedInteractionSchema.index({ userId: 1, publicationId: 1, interactionType: 1 });

const FeedInteraction = mongoose.model('FeedInteraction', FeedInteractionSchema);

module.exports = FeedInteraction;
