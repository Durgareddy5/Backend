const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const EmailOtpSchema = new Schema(
  {
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      index: true
    },
    otp: {
      type: String,
      required: true
    },
    purpose: {
      type: String,
      required: true,
      enum: ['registration', 'login', 'forgot_password']
    },
    attempts: {
      type: Number,
      default: 0
    },
    expiresAt: {
      type: Date,
      required: true
    },
    verified: {
      type: Boolean,
      default: false
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

EmailOtpSchema.index({ email: 1, purpose: 1 });
EmailOtpSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 }); // Auto-expire from DB
EmailOtpSchema.index({ isDeleted: 1 });

const EmailOtp = mongoose.model('EmailOtp', EmailOtpSchema);

module.exports = EmailOtp;
