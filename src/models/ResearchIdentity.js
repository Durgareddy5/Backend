const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const ResearchIdentitySchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
      index: true
    },
    preferredName: {
      type: String,
      trim: true
    },
    profileSlug: {
      type: String,
      trim: true,
      unique: true,
      index: true
    },
    googleScholarId: {
      type: String,
      trim: true,
      index: true
    },
    googleScholarUrl: {
      type: String,
      trim: true
    },
    orcid: {
      type: String,
      trim: true,
      index: true
    },
    scopusId: {
      type: String,
      trim: true,
      index: true
    },
    openAlexId: {
      type: String,
      trim: true,
      index: true
    },
    crossrefId: {
      type: String,
      trim: true,
      index: true
    },
    semanticScholarId: {
      type: String,
      trim: true,
      index: true
    },
    dblpUrl: {
      type: String,
      trim: true
    },
    researchGateUrl: {
      type: String,
      trim: true
    },
    linkedinUrl: {
      type: String,
      trim: true
    },
    github: {
      type: String,
      trim: true
    },
    personalWebsite: {
      type: String,
      trim: true
    },
    universityProfile: {
      type: String,
      trim: true
    },
    biography: {
      type: String,
      trim: true
    },
    languages: {
      type: [String],
      default: []
    },
    academicPositions: [
      {
        title: { type: String, required: true },
        institution: { type: String, required: true },
        department: { type: String },
        startDate: { type: Date },
        endDate: { type: Date },
        isCurrent: { type: Boolean, default: false }
      }
    ],
    grants: [
      {
        title: { type: String, required: true },
        agency: { type: String, required: true },
        amount: { type: Number, default: 0 },
        currency: { type: String, default: 'USD' },
        startDate: { type: Date },
        endDate: { type: Date }
      }
    ],
    teaching: [
      {
        courseName: { type: String, required: true },
        institution: { type: String, required: true },
        role: { type: String },
        year: { type: String }
      }
    ],
    syncSchedule: {
      type: String,
      enum: ['manual', 'daily', 'weekly', 'monthly'],
      default: 'manual'
    },
    isDeleted: {
      type: Boolean,
      default: false,
      index: true
    },
    deletedAt: {
      type: Date
    },
    deletedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User'
    }
  },
  {
    timestamps: true,
    collection: 'researchIdentities'
  }
);

const ResearchIdentity = mongoose.model('ResearchIdentity', ResearchIdentitySchema);
module.exports = ResearchIdentity;
