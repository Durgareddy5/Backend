const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const SyncHistorySchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    startedAt: {
      type: Date,
      required: true
    },
    completedAt: {
      type: Date
    },
    status: {
      type: String,
      enum: ['completed', 'failed'],
      required: true
    },
    importedPublicationsCount: {
      type: Number,
      default: 0
    },
    importedCitationsCount: {
      type: Number,
      default: 0
    },
    importedCoAuthorsCount: {
      type: Number,
      default: 0
    },
    error: {
      type: Schema.Types.Mixed,
      default: null
    }
  },
  {
    timestamps: true
  }
);

const SyncHistory = mongoose.model('SyncHistory', SyncHistorySchema);
module.exports = SyncHistory;
