const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const CoAuthorSchema = new Schema(
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
      index: true
    },
    name: {
      type: String,
      required: true,
      trim: true
    },
    affiliation: {
      type: String,
      default: ''
    },
    email: {
      type: String,
      default: ''
    },
    photo: {
      type: String,
      default: ''
    },
    profileURL: {
      type: String,
      default: ''
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
    timestamps: true,
    collection: 'coAuthors'
  }
);

CoAuthorSchema.index({ userId: 1, authorId: 1 }, { unique: true });
CoAuthorSchema.index({ isDeleted: 1 });

const CoAuthor = mongoose.model('CoAuthor', CoAuthorSchema);

module.exports = CoAuthor;
