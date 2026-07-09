const mongoose = require('mongoose');

const PublicationReaderSchema = new mongoose.Schema(
  {
    publicationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Publication',
      required: true,
      index: true
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    currentPage: {
      type: Number,
      default: 1
    },
    totalPages: {
      type: Number,
      default: 1
    },
    zoomLevel: {
      type: Number,
      default: 100
    },
    progress: {
      type: Number,
      default: 0 // percentage 0-100
    },
    lastReadAt: {
      type: Date,
      default: Date.now
    }
  },
  {
    timestamps: true,
    collection: 'publicationReaders'
  }
);

// Create compound index for unique reading sessions per user/publication
PublicationReaderSchema.index({ publicationId: 1, userId: 1 }, { unique: true });

module.exports = mongoose.model('PublicationReader', PublicationReaderSchema);
