const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const ResearchMetricSchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
      index: true
    },
    publicationsCount: {
      type: Number,
      default: 0
    },
    citationsCount: {
      type: Number,
      default: 0
    },
    hIndex: {
      type: Number,
      default: 0
    },
    i10Index: {
      type: Number,
      default: 0
    },
    experienceYears: {
      type: Number,
      default: 0
    },
    projectsCount: {
      type: Number,
      default: 0
    },
    patentsCount: {
      type: Number,
      default: 0
    },
    booksCount: {
      type: Number,
      default: 0
    },
    datasetsCount: {
      type: Number,
      default: 0
    },
    downloadsCount: {
      type: Number,
      default: 0
    },
    viewsCount: {
      type: Number,
      default: 0
    },
    followersCount: {
      type: Number,
      default: 0
    },
    followingCount: {
      type: Number,
      default: 0
    },
    researchScore: {
      type: Number,
      default: 0
    },
    isDeleted: {
      type: Boolean,
      default: false
    }
  },
  {
    timestamps: true,
    collection: 'researchMetrics'
  }
);

const ResearchMetric = mongoose.model('ResearchMetric', ResearchMetricSchema);
module.exports = ResearchMetric;
