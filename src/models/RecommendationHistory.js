const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const RecommendationHistorySchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    targetId: { type: Schema.Types.ObjectId, required: true },
    targetType: { 
      type: String, 
      required: true, 
      enum: ['User', 'Publication', 'Project', 'Funding', 'Conference'] 
    },
    action: { 
      type: String, 
      required: true, 
      enum: ['impression', 'click', 'dismiss', 'accept', 'follow', 'connect', 'join', 'view', 'download'] 
    },
    isDeleted: { type: Boolean, default: false }
  },
  {
    timestamps: true,
    collection: 'recommendationHistory'
  }
);

RecommendationHistorySchema.index({ userId: 1, targetId: 1, action: 1 });
RecommendationHistorySchema.index({ isDeleted: 1 });

module.exports = mongoose.model('RecommendationHistory', RecommendationHistorySchema);
