const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const ProfileAnalyticsSchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    views: {
      type: Number,
      default: 0
    },
    downloads: {
      type: Number,
      default: 0
    },
    shares: {
      type: Number,
      default: 0
    },
    date: {
      type: Date,
      required: true, // Truncated to day boundary (e.g. YYYY-MM-DD)
      index: true
    }
  },
  {
    timestamps: true
  }
);

ProfileAnalyticsSchema.index({ userId: 1, date: 1 }, { unique: true });

const ProfileAnalytics = mongoose.model('ProfileAnalytics', ProfileAnalyticsSchema);
module.exports = ProfileAnalytics;
