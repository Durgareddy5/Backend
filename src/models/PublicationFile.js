const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const PublicationFileSchema = new Schema(
  {
    publicationId: {
      type: Schema.Types.ObjectId,
      ref: 'Publication',
      required: true,
      index: true
    },
    secure_url: {
      type: String,
      required: true
    },
    public_id: {
      type: String,
      required: true
    },
    resource_type: {
      type: String,
      default: 'raw'
    },
    bytes: {
      type: Number,
      default: 0
    },
    format: {
      type: String,
      default: ''
    },
    pages: {
      type: Number,
      default: 0
    },
    asset_id: {
      type: String,
      default: ''
    },
    isDeleted: {
      type: Boolean,
      default: false
    }
  },
  {
    timestamps: true,
    collection: 'publicationFiles'
  }
);

const PublicationFile = mongoose.model('PublicationFile', PublicationFileSchema);

module.exports = PublicationFile;
