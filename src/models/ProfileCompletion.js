const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const ProfileCompletionSchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
      index: true
    },
    percentage: {
      type: Number,
      min: 0,
      max: 100,
      default: 0
    },
    breakdown: {
      type: Schema.Types.Mixed,
      default: {
        profilePhoto: false,
        coverBanner: false,
        basicInfo: false,
        location: false,
        institution: false,
        researchIdentity: false,
        education: false,
        experience: false,
        skills: false,
        bio: false,
        publications: false,
        projects: false
      }
    }
  },
  {
    timestamps: true
  }
);

const ProfileCompletion = mongoose.model('ProfileCompletion', ProfileCompletionSchema);
module.exports = ProfileCompletion;
