const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const IdentitySyncLogSchema = new Schema(
  {
    jobId: {
      type: Schema.Types.ObjectId,
      ref: 'IdentitySyncJob',
      required: true,
      index: true
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    level: {
      type: String,
      enum: ['info', 'warn', 'error'],
      default: 'info',
      index: true
    },
    message: {
      type: String,
      required: true
    }
  },
  {
    timestamps: true,
    collection: 'identitySyncLogs'
  }
);

const IdentitySyncLog = mongoose.model('IdentitySyncLog', IdentitySyncLogSchema);
module.exports = IdentitySyncLog;
