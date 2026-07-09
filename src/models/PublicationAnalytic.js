const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const PublicationAnalyticSchema = new Schema(
  {
    publicationId: {
      type: Schema.Types.ObjectId,
      ref: 'Publication',
      required: true,
      index: true
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      index: true
    },
    eventType: {
      type: String,
      enum: ['view', 'download', 'bookmark', 'share', 'comment'],
      required: true,
      index: true
    },
    ipAddress: {
      type: String,
      default: ''
    },
    userAgent: {
      type: String,
      default: ''
    }
  },
  {
    timestamps: true,
    collection: 'publicationAnalytics'
  }
);

// Add composite index for timeline queries
PublicationAnalyticSchema.index({ publicationId: 1, eventType: 1, createdAt: -1 });

const PublicationAnalytic = mongoose.model('PublicationAnalytic', PublicationAnalyticSchema);

module.exports = PublicationAnalytic;
