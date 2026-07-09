const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const ShareSchema = new Schema(
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
    platform: {
      type: String,
      enum: ['internal', 'twitter', 'linkedin', 'email', 'copy_link'],
      default: 'internal'
    }
  },
  {
    timestamps: true
  }
);

const Share = mongoose.model('Share', ShareSchema);

module.exports = Share;
