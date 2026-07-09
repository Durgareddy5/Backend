const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const SecurityLogSchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      index: true
    },
    email: {
      type: String,
      trim: true,
      index: true
    },
    event: {
      type: String,
      required: true,
      trim: true,
      index: true
    },
    description: {
      type: String,
      trim: true
    },
    ip: {
      type: String,
      default: ''
    },
    userAgent: {
      type: String,
      default: ''
    },
    device: {
      type: String,
      default: 'Unknown'
    },
    browser: {
      type: String,
      default: 'Unknown'
    },
    os: {
      type: String,
      default: 'Unknown'
    }
  },
  {
    timestamps: true
  }
);

SecurityLogSchema.index({ createdAt: -1 });

const SecurityLog = mongoose.model('SecurityLog', SecurityLogSchema);

module.exports = SecurityLog;
