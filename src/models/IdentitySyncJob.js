const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const IdentitySyncJobSchema = new Schema(
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
      index: true
    },
    status: {
      type: String,
      enum: ['pending', 'running', 'completed', 'failed'],
      default: 'pending',
      index: true
    },
    progress: {
      type: Number,
      default: 0
    },
    retryCount: {
      type: Number,
      default: 0
    },
    error: {
      message: { type: String },
      stack: { type: String }
    },
    startedAt: {
      type: Date
    },
    completedAt: {
      type: Date
    },
    isDeleted: {
      type: Boolean,
      default: false,
      index: true
    }
  },
  {
    timestamps: true,
    collection: 'identitySyncJobs'
  }
);

const IdentitySyncJob = mongoose.model('IdentitySyncJob', IdentitySyncJobSchema);
module.exports = IdentitySyncJob;
