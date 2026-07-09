const mongoose = require('mongoose');

const collaborationInvitationSchema = new mongoose.Schema(
  {
    collaborationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Collaboration',
      required: true,
      index: true
    },
    invitedUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      index: true
    },
    invitedEmail: {
      type: String,
      trim: true,
      lowercase: true,
      index: true
    },
    invitedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    role: {
      type: String,
      enum: [
        'PI',
        'Co-PI',
        'Research Assistant',
        'Collaborator',
        'Student',
        'Viewer',
        'Admin'
      ],
      default: 'Collaborator'
    },
    note: {
      type: String
    },
    status: {
      type: String,
      enum: ['Pending', 'Accepted', 'Rejected'],
      default: 'Pending',
      index: true
    }
  },
  {
    timestamps: true
  }
);

// Prevent duplicate pending invites
collaborationInvitationSchema.index(
  { collaborationId: 1, invitedEmail: 1, status: 1 },
  { unique: true, partialFilterExpression: { status: 'Pending' } }
);

module.exports = mongoose.model('CollaborationInvitation', collaborationInvitationSchema);
