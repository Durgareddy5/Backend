const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const BookmarkSchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    publicationId: {
      type: Schema.Types.ObjectId,
      ref: 'Publication',
      required: true,
      index: true
    },
    folderName: {
      type: String,
      default: 'General',
      trim: true
    },
    isPrivate: {
      type: Boolean,
      default: true
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

BookmarkSchema.index({ userId: 1, publicationId: 1 }, { unique: true });

const Bookmark = mongoose.model('Bookmark', BookmarkSchema);

module.exports = Bookmark;
