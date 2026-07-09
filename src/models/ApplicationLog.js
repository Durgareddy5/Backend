const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const ApplicationLogSchema = new Schema(
  {
    timestamp: {
      type: Date,
      default: Date.now,
      required: true
    },
    level: {
      type: String,
      required: true,
      trim: true
    },
    message: {
      type: String,
      required: true,
      trim: true
    },
    meta: {
      type: Schema.Types.Mixed,
      default: {}
    },
    requestId: {
      type: String,
      trim: true,
      default: ''
    }
  },
  {
    timestamps: true
  }
);

// Indexes
ApplicationLogSchema.index({ timestamp: -1 });
ApplicationLogSchema.index({ level: 1 });
ApplicationLogSchema.index({ requestId: 1 });

const ApplicationLog = mongoose.model('ApplicationLog', ApplicationLogSchema);

module.exports = ApplicationLog;
