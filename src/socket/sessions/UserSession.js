const mongoose = require('mongoose');

const userSessionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    deviceToken: {
      type: String
    },
    userAgent: {
      type: String
    },
    platform: {
      type: String
    },
    lastActiveAt: {
      type: Date,
      default: Date.now
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model('UserSession', userSessionSchema);
