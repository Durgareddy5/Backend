const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const SocialLinkSchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
      index: true
    },
    orcid: {
      type: String,
      trim: true,
      default: ''
    },
    googleScholar: {
      type: String,
      trim: true,
      default: ''
    },
    researchGate: {
      type: String,
      trim: true,
      default: ''
    },
    linkedin: {
      type: String,
      trim: true,
      default: ''
    },
    website: {
      type: String,
      trim: true,
      default: ''
    },
        scopus: {
      type: String,
      trim: true,
      default: ''
    },
    twitter: {
      type: String,
      trim: true,
      default: ''
    },
    youtube: {
      type: String,
      trim: true,
      default: ''
    },
    isDeleted: {
      type: Boolean,
      default: false
    }
  },
  {
    timestamps: true
  }
);

const SocialLink = mongoose.model('SocialLink', SocialLinkSchema);
module.exports = SocialLink;
