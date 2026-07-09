const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const PublicationEditSchema = new Schema(
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
    editedFields: [
      {
        type: String
      }
    ],
    previousValues: {
      type: Schema.Types.Mixed,
      default: {}
    },
    newValues: {
      type: Schema.Types.Mixed,
      default: {}
    }
  },
  {
    timestamps: true,
    collection: 'publicationEdits'
  }
);

const PublicationEdit = mongoose.model('PublicationEdit', PublicationEditSchema);

module.exports = PublicationEdit;
