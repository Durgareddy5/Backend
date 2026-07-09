const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const PublicationCitationSchema = new Schema(
  {
    publicationId: {
      type: Schema.Types.ObjectId,
      ref: 'Publication',
      required: true,
      unique: true,
      index: true
    },
    copyCount: {
      type: Number,
      default: 0
    },
    exportCount: {
      type: Number,
      default: 0
    },
    downloadCount: {
      type: Number,
      default: 0
    },
    lastGeneratedAt: {
      type: Date
    },
    formatBreakdown: {
      // Map of format → count, e.g. { apa: 10, bibtex: 5 }
      type: Map,
      of: Number,
      default: {}
    }
  },
  {
    timestamps: true,
    collection: 'publicationCitations'
  }
);

module.exports = mongoose.model('PublicationCitation', PublicationCitationSchema);
