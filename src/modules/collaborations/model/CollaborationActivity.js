const mongoose = require('mongoose');

const collaborationActivitySchema = new mongoose.Schema(
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
    actionType: {
      type: String,
      enum: [
        'member_joined',
        'member_left',
        'task_created',
        'task_completed',
        'file_uploaded',
        'publication_shared',
        'dataset_shared',
        'meeting_scheduled'
      ],
      required: true
    },
    details: {
      type: String
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model('CollaborationActivity', collaborationActivitySchema);
