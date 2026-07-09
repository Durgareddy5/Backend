const mongoose = require('mongoose');

const collaborationMemberSchema = new mongoose.Schema(
  {
    collaborationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Collaboration',
      required: true,
      index: true
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    role: {
      type: String,
      enum: [
        'Owner',
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
    muted: {
      type: Boolean,
      default: false
    }
  },
  {
    timestamps: true
  }
);

// Enforce unique member per workspace
collaborationMemberSchema.index({ collaborationId: 1, userId: 1 }, { unique: true });

module.exports = mongoose.model('CollaborationMember', collaborationMemberSchema);
