const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const ConnectionRequestSchema = new Schema(
  {
    senderId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    receiverId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    note: {
      type: String,
      maxlength: [300, 'Note cannot exceed 300 characters'],
      default: ''
    },
    status: {
      type: String,
      enum: ['pending', 'accepted', 'rejected', 'withdrawn'],
      default: 'pending',
      index: true
    }
  },
  {
    timestamps: true
  }
);

// Ensure unique requests between sender and receiver
ConnectionRequestSchema.index({ senderId: 1, receiverId: 1 }, { unique: true });

const ConnectionRequest = mongoose.model('ConnectionRequest', ConnectionRequestSchema);

module.exports = ConnectionRequest;
