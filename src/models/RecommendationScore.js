const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const RecommendationScoreSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    targetId: { type: Schema.Types.ObjectId, required: true },
    targetType: { 
      type: String, 
      required: true, 
      enum: ['User', 'Publication', 'Project', 'Funding', 'Conference'] 
    },
    score: { type: Number, required: true, min: 0, max: 100 },
    reasons: [{ type: String }],
    isDeleted: { type: Boolean, default: false }
  },
  {
    timestamps: true,
    collection: 'recommendationScores'
  }
);

RecommendationScoreSchema.index({ userId: 1, targetType: 1, score: -1 });
RecommendationScoreSchema.index({ userId: 1, targetId: 1, targetType: 1 }, { unique: true });
RecommendationScoreSchema.index({ isDeleted: 1 });

module.exports = mongoose.model('RecommendationScore', RecommendationScoreSchema);
