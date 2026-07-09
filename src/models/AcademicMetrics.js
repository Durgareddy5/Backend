const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const AcademicMetricsSchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    provider: {
      type: String,
      required: true,
      default: 'aggregate', // 'aggregate' or 'google_scholar', 'orcid', etc.
      index: true
    },
    publications: {
      type: Number,
      default: 0
    },
    citations: {
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
    reads: {
      type: Number,
      default: 0
    },
    downloads: {
      type: Number,
      default: 0
    },
    views: {
      type: Number,
      default: 0
    },
    followers: {
      type: Number,
      default: 0
    },
    following: {
      type: Number,
      default: 0
    },
    connections: {
      type: Number,
      default: 0
    },
    projects: {
      type: Number,
      default: 0
    },
    datasets: {
      type: Number,
      default: 0
    },
    books: {
      type: Number,
      default: 0
    },
    patents: {
      type: Number,
      default: 0
    },
    grants: {
      type: Number,
      default: 0
    },
    researchExperience: {
      type: Number,
      default: 0 // In years
    },
    isDeleted: {
      type: Boolean,
      default: false,
      index: true
    }
  },
  {
    timestamps: true,
    collection: 'academicMetrics'
  }
);

AcademicMetricsSchema.index({ userId: 1, provider: 1 }, { unique: true });

const AcademicMetrics = mongoose.model('AcademicMetrics', AcademicMetricsSchema);
module.exports = AcademicMetrics;
