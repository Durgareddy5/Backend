const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const SettingsSchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true
    },
    theme: {
      type: String,
      enum: ['light', 'dark', 'system'],
      default: 'light'
    },
    language: {
      type: String,
      default: 'en'
    },
    notifications: {
      email: { type: Boolean, default: true },
      push: { type: Boolean, default: true },
      weeklyDigest: { type: Boolean, default: true }
    },
    privacy: {
      profileVisible: { type: Boolean, default: true },
      showPublications: { type: Boolean, default: true },
      showStats: { type: Boolean, default: true }
    },
    timezone: {
      type: String,
      default: 'UTC'
    }
  },
  {
    timestamps: true
  }
);

// Indexes automatically handled by unique constraint on userId field

const Settings = mongoose.model('Settings', SettingsSchema);

module.exports = Settings;
