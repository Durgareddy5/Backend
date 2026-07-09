const mongoose = require('mongoose');

const collaborationSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true
    },
    title: {
      type: String,
      trim: true
    },
    description: {
      type: String
    },
    researchArea: {
      type: String
    },
    keywords: [
      {
        type: String
      }
    ],
    visibility: {
      type: String,
      enum: ['Private', 'Invite Only', 'Institution'],
      default: 'Private'
    },
    institution: {
      type: String
    },
    country: {
      type: String
    },
    expectedDuration: {
      type: String
    },
    startDate: {
      type: Date
    },
    endDate: {
      type: Date
    },
    researchStage: {
      type: String,
      enum: ['Idea', 'Proposal', 'Ongoing', 'Completed'],
      default: 'Idea'
    },
    fundingStatus: {
      type: String,
      enum: ['Funded', 'Unfunded', 'Grant Pending'],
      default: 'Unfunded'
    },
    slug: {
      type: String,
      unique: true,
      index: true
    }
  },
  {
    timestamps: true
  }
);

// Pre-save hook to generate permanent slug if not present
collaborationSchema.pre('save', function (next) {
  if (!this.slug) {
    const base = this.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)+/g, '');
    const rand = Math.random().toString(36).substring(2, 6).toUpperCase();
    const prefix = Math.floor(10 + Math.random() * 90);
    this.slug = `${base}-RCWSP${prefix}${rand}`;
  }
  next();
});

module.exports = mongoose.model('Collaboration', collaborationSchema);
