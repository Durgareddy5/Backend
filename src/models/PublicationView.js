const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const PublicationViewSchema = new Schema(
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
    collection: 'publicationViews'
  }
);

const PublicationView = mongoose.model('PublicationView', PublicationViewSchema);

module.exports = PublicationView;
