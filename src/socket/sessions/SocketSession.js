const mongoose = require('mongoose');

const socketSessionSchema = new mongoose.Schema(
  {
    socketId: {
      type: String,
      required: true,
      unique: true,
      index: true
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    device: {
      type: String,
      default: 'unknown'
    },
    platform: {
      type: String,
      default: 'unknown'
    },
    browser: {
      type: String,
      default: 'unknown'
    },
    ip: {
      type: String
    },
    connectedAt: {
      type: Date,
      default: Date.now
    },
    disconnectedAt: {
      type: Date
    },
    lastHeartbeat: {
      type: Date,
      default: Date.now,
      index: true
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model('SocketSession', socketSessionSchema);
