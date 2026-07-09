const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const SessionSchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    browser: {
      type: String,
      default: 'Unknown'
    },
    device: {
      type: String,
      default: 'Unknown'
    },
    os: {
      type: String,
      default: 'Unknown'
    },
    ip: {
      type: String,
      default: ''
    },
    location: {
      type: String,
      default: 'Unknown'
    },
    loginTime: {
      type: Date,
      default: Date.now
    },
    logoutTime: {
      type: Date
    },
    rememberMe: {
      type: Boolean,
      default: false
    },
    active: {
      type: Boolean,
      default: true,
      index: true
    },
    status: {
      type: String,
      enum: ['active', 'expired', 'revoked'],
      default: 'active'
    },
    isDeleted: {
      type: Boolean,
      default: false
    }
  },
  {
    timestamps: true
  }
);

SessionSchema.pre('save', function (next) {
  if (this.isModified('active')) {
    this.status = this.active ? 'active' : 'revoked';
  } else if (this.isModified('status')) {
    this.active = this.status === 'active';
  }
  next();
});

SessionSchema.index({ userId: 1, active: 1 });
SessionSchema.index({ isDeleted: 1 });

const Session = mongoose.model('Session', SessionSchema);

module.exports = Session;
