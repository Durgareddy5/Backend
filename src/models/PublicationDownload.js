const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const PublicationDownloadSchema = new Schema(
  {
    publicationId: {
      type: Schema.Types.ObjectId,
      ref: 'Publication',
      required: true,
      index: true
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      index: true
    },
    ipAddress: {
      type: String,
      default: ''
    },
    userAgent: {
      type: String,
      default: ''
    }
  },
  {
    timestamps: true,
    collection: 'publicationDownloads'
  }
);

const PublicationDownload = mongoose.model('PublicationDownload', PublicationDownloadSchema);

module.exports = PublicationDownload;
