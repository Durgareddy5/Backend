const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const ImportSchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    provider: {
      type: String,
      required: true,
      default: 'google_scholar'
    },
    status: {
      type: String,
      enum: ['pending', 'running', 'completed', 'failed', 'cancelled'],
      default: 'pending',
      index: true
    },
    progress: {
      type: Number,
      default: 0,
      min: 0,
      max: 100
    },
    error: {
      type: Schema.Types.Mixed,
      default: null
    },
    retryCount: {
      type: Number,
      default: 0
    },
    lastAttemptAt: {
      type: Date
    },
    completedAt: {
      type: Date
    },
    metadata: {
      type: Schema.Types.Mixed,
      default: {}
    }
  },
  {
    timestamps: true
  }
);

ImportSchema.index({ userId: 1, provider: 1 });

const Import = mongoose.model('Import', ImportSchema);

module.exports = Import;
