const mongoose = require('mongoose');
const Schema = mongoose.Schema;

/**
 * FeedRanking — Per-user computed ranking signal cache.
 * Stores precomputed context vectors for fast feed personalization.
 * Updated on follow/unfollow, profile changes, etc.
 */
const FeedRankingSchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
      index: true
    },

    // Research interests extracted from profile
    researchInterests: [String],

    // Normalized keyword set for interest scoring
    keywordVector: [String],

    // IDs of researchers this user follows
    followingIds: [
      {
        type: Schema.Types.ObjectId,
        ref: 'User'
      }
    ],

    // IDs of connected researchers
    connectionIds: [
      {
        type: Schema.Types.ObjectId,
        ref: 'User'
      }
    ],

    // Collaboration workspace IDs
    collaborationIds: [
      {
        type: Schema.Types.ObjectId,
        ref: 'Collaboration'
      }
    ],

    // Normalized institution name for geo-scoring
    institution: String,

    // Country for geo-scoring
    country: String,

    // Timestamp of last ranking signal recomputation
    lastComputedAt: {
      type: Date,
      default: Date.now
    }
  },
  {
    timestamps: true
  }
);

const FeedRanking = mongoose.model('FeedRanking', FeedRankingSchema);

module.exports = FeedRanking;
