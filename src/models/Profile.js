const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const ProfileSchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
      index: true
    },
    bio: {
      type: String,
      maxlength: [500, 'Bio cannot exceed 500 characters'],
      default: ''
    },
    displayName: {
      type: String,
      trim: true,
      default: ''
    },
    headline: {
      type: String,
      trim: true,
      default: ''
    },
    coverImage: {
      type: String,
      default: 'https://iili.io/C7pZ8Ss.jpg'
    },
    profileImage: {
      type: String,
      default: ''
    },
    dateOfBirth: {
      type: String,
      default: ''
    },
    nationality: {
      type: String,
      trim: true,
      default: ''
    },
    country: {
      type: String,
      trim: true,
      default: ''
    },
    state: {
      type: String,
      trim: true,
      default: ''
    },
    city: {
      type: String,
      trim: true,
      default: ''
    },
    institution: {
      type: String,
      trim: true,
      default: ''
    },
    department: {
      type: String,
      trim: true,
      default: ''
    },
    designation: {
      type: String,
      trim: true,
      default: ''
    },
    organization: {
      type: String,
      trim: true,
      default: ''
    },
    researchGroup: {
      type: String,
      trim: true,
      default: ''
    },
    languages: [
      {
        type: String,
        trim: true
      }
    ],
    availability: {
      type: String,
      trim: true,
      default: ''
    },
    openToCollaborate: {
      type: Boolean,
      default: false
    },
    openToMentor: {
      type: Boolean,
      default: false
    },
    openToResearch: {
      type: Boolean,
      default: false
    },
    emailVisibility: {
      type: String,
      enum: ['public', 'private', 'connections'],
      default: 'private'
    },
    company: {
      type: String,
      trim: true,
      default: ''
    },
    division: {
      type: String,
      trim: true,
      default: ''
    },
    position: {
      type: String,
      trim: true,
      default: ''
    },
    // Rich biography sections
    researchSummary: {
      type: String,
      default: ''
    },
    currentResearch: {
      type: String,
      default: ''
    },
    researchVision: {
      type: String,
      default: ''
    },
    // Subdocument arrays
    education: [
      {
        degree: { type: String, required: true },
        university: { type: String, required: true },
        duration: { type: String, required: true }, // e.g. "2018 - 2022"
        cgpa: { type: String, default: '' },
        specialization: { type: String, default: '' },
        description: { type: String, default: '' }
      }
    ],
    experience: [
      {
        designation: { type: String, required: true },
        institution: { type: String, required: true },
        duration: { type: String, required: true }, // e.g. "2022 - Present"
        description: { type: String, default: '' },
        researchFocus: { type: String, default: '' }
      }
    ],
    projects: [
      {
        title: { type: String, required: true },
        description: { type: String, default: '' },
        technology: { type: String, default: '' }, // comma separated or single string
        duration: { type: String, default: '' },
        status: { type: String, default: 'Ongoing' }, // Ongoing, Completed, Proposed
        collaborators: { type: String, default: '' }
      }
    ],
    skills: [
      {
        name: { type: String, required: true },
        category: {
          type: String,
          enum: ['Programming', 'AI', 'ML', 'Cloud', 'Research', 'Writing', 'Statistics', 'Other'],
          default: 'Other'
        }
      }
    ],
    achievements: [
      {
        title: { type: String, required: true },
        type: {
          type: String,
          enum: ['Award', 'Patent', 'Honor', 'Recognition'],
          required: true
        },
        organization: { type: String, required: true },
        year: { type: Number, required: true },
        description: { type: String, default: '' }
      }
    ],
    certifications: [
      {
        name: { type: String, required: true },
        organization: { type: String, required: true },
        issueDate: { type: String, default: '' },
        credentialUrl: { type: String, default: '' }
      }
    ],
    // Academic & research metrics
    metrics: {
      totalCitations: { type: Number, default: 0 },
      hIndex: { type: Number, default: 0 },
      i10Index: { type: Number, default: 0 },
      researchExperience: { type: Number, default: 0 }, // in years
      patentsCount: { type: Number, default: 0 },
      booksCount: { type: Number, default: 0 },
      datasetsCount: { type: Number, default: 0 },
      downloadsCount: { type: Number, default: 0 },
      viewsCount: { type: Number, default: 0 },
      researchScore: { type: Number, default: 0 }
    },
    socialLinks: {
      orcid: { type: String, default: '', trim: true },
      googleScholar: { type: String, default: '', trim: true },
      researchGate: { type: String, default: '', trim: true },
      linkedin: { type: String, default: '', trim: true },
      website: { type: String, default: '', trim: true },
      scopus: { type: String, default: '', trim: true }
    },
    profileCompletion: {
      type: Number,
      min: 0,
      max: 100,
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
    connectionsCount: {
      type: Number,
      default: 0
    },
    pendingSentCount: {
      type: Number,
      default: 0
    },
    pendingReceivedCount: {
      type: Number,
      default: 0
    },
    notificationSettings: {
      follow: { type: Boolean, default: true },
      connection: { type: Boolean, default: true },
      publication: { type: Boolean, default: true },
      comment: { type: Boolean, default: true },
      mention: { type: Boolean, default: true },
      system: { type: Boolean, default: true }
    },
    dataSourceTracking: {
      type: Map,
      of: new Schema({
        value: Schema.Types.Mixed,
        source: { type: String, enum: ['google_scholar', 'user'], default: 'user' },
        lastSyncedAt: { type: Date },
        lastModifiedAt: { type: Date },
        userModified: { type: Boolean, default: false }
      }, { _id: false }),
      default: {}
    },
    isDeleted: {
      type: Boolean,
      default: false
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
    timestamps: true
  }
);

// Indexes for searching specialists/universities
ProfileSchema.index({ institution: 1 });
ProfileSchema.index({ company: 1 });
ProfileSchema.index({ isDeleted: 1 });

const Profile = mongoose.model('Profile', ProfileSchema);

module.exports = Profile;
