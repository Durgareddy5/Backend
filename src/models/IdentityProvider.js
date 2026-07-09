const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const IdentityProviderSchema = new Schema(
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
      enum: [
        'google_scholar',
        'orcid',
        'scopus',
        'crossref',
        'openalex',
        'semantic_scholar',
        'dblp',
        'github',
        'linkedin'
      ],
      index: true
    },
    providerUserId: {
      type: String,
      required: true,
      trim: true
    },
    accessToken: {
      type: String,
      default: ''
    },
    refreshToken: {
      type: String,
      default: ''
    },
    expiresAt: {
      type: Date
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
    collection: 'identityProviders'
  }
);

IdentityProviderSchema.index({ userId: 1, provider: 1 }, { unique: true });

const IdentityProvider = mongoose.model('IdentityProvider', IdentityProviderSchema);
module.exports = IdentityProvider;
