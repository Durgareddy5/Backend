const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const PublicationKeywordSchema = new Schema(
  {
    publicationId: {
      type: Schema.Types.ObjectId,
      ref: 'Publication',
      required: true,
      index: true
    },
    keyword: {
      type: String,
      required: true,
      trim: true,
      index: true
    }
  },
  {
    timestamps: true,
    collection: 'publicationKeywords'
  }
);

// Compound index to avoid duplicate keyword mappings
PublicationKeywordSchema.index({ publicationId: 1, keyword: 1 }, { unique: true });

const PublicationKeyword = mongoose.model('PublicationKeyword', PublicationKeywordSchema);

module.exports = PublicationKeyword;
