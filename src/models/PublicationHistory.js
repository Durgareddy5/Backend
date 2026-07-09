const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const PublicationHistorySchema = new Schema(
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
    action: {
      type: String,
      required: true,
      enum: ['create', 'update', 'publish', 'draft_save', 'delete', 'restore']
    },
    changes: {
      type: Schema.Types.Mixed,
      default: {}
    }
  },
  {
    timestamps: true,
    collection: 'publicationHistory'
  }
);

const PublicationHistory = mongoose.model('PublicationHistory', PublicationHistorySchema);

module.exports = PublicationHistory;
