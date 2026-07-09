const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const PublicationAuthorSchema = new Schema(
  {
    publicationId: {
      type: Schema.Types.ObjectId,
      ref: 'Publication',
      required: true,
      index: true
    },
    authorId: {
      type: String,
      default: '',
      index: true
    },
    name: {
      type: String,
      required: true,
      trim: true
    },
    email: {
      type: String,
      default: '',
      trim: true
    },
    institution: {
      type: String,
      default: ''
    },
    department: {
      type: String,
      default: ''
    },
    isCoAuthor: {
      type: Boolean,
      default: false
    },
    isCorresponding: {
      type: Boolean,
      default: false
    },
    order: {
      type: Number,
      default: 0
    }
  },
  {
    timestamps: true,
    collection: 'publicationAuthors'
  }
);

PublicationAuthorSchema.index({ publicationId: 1, authorId: 1 });

const PublicationAuthor = mongoose.model('PublicationAuthor', PublicationAuthorSchema);

module.exports = PublicationAuthor;
