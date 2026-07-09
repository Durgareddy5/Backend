const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const RecommendationSchema = new Schema(
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
    isDeleted: {
      type: Boolean,
      default: false
    }
  },
  {
    timestamps: true,
    collection: 'publicationRecommendations'
  }
);

RecommendationSchema.index({ userId: 1, publicationId: 1 }, { unique: true });

const Recommendation = mongoose.model('Recommendation', RecommendationSchema);

module.exports = Recommendation;
