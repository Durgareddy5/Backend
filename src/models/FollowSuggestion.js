const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const FollowSuggestionSchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    suggestedUserId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    score: {
      type: Number,
      default: 0
    },
    reason: {
      type: String,
      default: ''
    }
  },
  {
    timestamps: true
  }
);

FollowSuggestionSchema.index({ userId: 1, suggestedUserId: 1 }, { unique: true });

const FollowSuggestion = mongoose.model('FollowSuggestion', FollowSuggestionSchema);

module.exports = FollowSuggestion;
