const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const GoogleScholarProfileSchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    authorId: {
      type: String,
      required: true,
      unique: true,
      index: true
    },
    profileURL: {
      type: String,
      default: ''
    },
    name: {
      type: String,
      required: true
    },
    affiliation: {
      type: String,
      default: ''
    },
    verifiedEmail: {
      type: String,
      default: ''
    },
    profileImage: {
      type: String,
      default: ''
    },
    researchInterests: [
      {
        type: String,
        trim: true
      }
    ],
    totalCitations: {
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
    verified: {
      type: Boolean,
      default: false
    },
    lastImportedAt: {
      type: Date
    },
    syncStatus: {
      type: String,
      enum: ['pending', 'running', 'completed', 'failed'],
      default: 'pending'
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

GoogleScholarProfileSchema.index({ isDeleted: 1 });

const GoogleScholarProfile = mongoose.model('GoogleScholarProfile', GoogleScholarProfileSchema);

module.exports = GoogleScholarProfile;
