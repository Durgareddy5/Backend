const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const PublicationCommentSchema = new Schema(
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
    content: {
      type: String,
      required: true,
      trim: true,
      maxlength: 1500
    },
    parentId: {
      type: Schema.Types.ObjectId,
      ref: 'PublicationComment',
      default: null,
      index: true
    },
    likes: [
      {
        type: Schema.Types.ObjectId,
        ref: 'User'
      }
    ],
    isEdited: {
      type: Boolean,
      default: false
    },
    editedAt: {
      type: Date
    }
  },
  {
    timestamps: true,
    collection: 'publicationComments'
  }
);

const PublicationComment = mongoose.model('PublicationComment', PublicationCommentSchema);

module.exports = PublicationComment;
