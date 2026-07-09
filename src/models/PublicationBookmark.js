const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const PublicationBookmarkSchema = new Schema(
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
      required: true,
      index: true
    },
    folder: {
      type: String,
      default: 'Unsorted',
      trim: true
    }
  },
  {
    timestamps: true,
    collection: 'publicationBookmarks'
  }
);

// Unique bookmark per user per publication
PublicationBookmarkSchema.index({ userId: 1, publicationId: 1 }, { unique: true });

const PublicationBookmark = mongoose.model('PublicationBookmark', PublicationBookmarkSchema);

module.exports = PublicationBookmark;
