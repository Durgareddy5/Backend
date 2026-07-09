const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const RecommendationProfileSchema = new Schema(
  {
    userId: { 
      type: Schema.Types.ObjectId, 
      ref: 'User', 
      required: true, 
      unique: true, 
      index: true 
    },
    researchAreas: [{ type: String, trim: true }],
    keywords: [{ type: String, trim: true }],
    institutions: [{ type: String, trim: true }],
    coAuthors: [{ type: String, trim: true }],
    projects: [{ type: Schema.Types.ObjectId, ref: 'Project' }],
    datasets: [{ type: Schema.Types.ObjectId, ref: 'Dataset' }],
    countries: [{ type: String, trim: true }],
    languages: [{ type: String, trim: true }],
    activityCount: { type: Number, default: 0 },
    lastActiveAt: { type: Date, default: Date.now },
    isDeleted: { type: Boolean, default: false }
  },
  {
    timestamps: true,
    collection: 'recommendationProfiles'
  }
);

RecommendationProfileSchema.index({ isDeleted: 1 });

module.exports = mongoose.model('RecommendationProfile', RecommendationProfileSchema);
