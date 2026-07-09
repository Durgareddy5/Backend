const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const PublicationMetricSchema = new Schema(
  {
    publicationId: {
      type: Schema.Types.ObjectId,
      ref: 'Publication',
      required: true,
      unique: true,
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
    citations: {
      type: Number,
      default: 0
    },
    shares: {
      type: Number,
      default: 0
    },
    bookmarks: {
      type: Number,
      default: 0
    },
    comments: {
      type: Number,
      default: 0
    },
    recommendations: {
      type: Number,
      default: 0
    }
  },
  {
    timestamps: true,
    collection: 'publicationMetrics'
  }
);

const PublicationMetric = mongoose.model('PublicationMetric', PublicationMetricSchema);

module.exports = PublicationMetric;
