const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const FeedSchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    publications: [
      {
        publicationId: {
          type: Schema.Types.ObjectId,
          ref: 'Publication',
          required: true
        },
        score: {
          type: Number,
          default: 0
        }
      }
    ],
    isDeleted: {
      type: Boolean,
      default: false
    }
  },
  {
    timestamps: true
  }
);

const Feed = mongoose.model('Feed', FeedSchema);

module.exports = Feed;
