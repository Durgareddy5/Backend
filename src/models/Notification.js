const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const NotificationSchema = new Schema(
  {
    recipientId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    actorId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    type: {
      type: String,
      required: true,
      enum: [
        'follow',
        'connection_request',
        'connection_accepted',
        'connection_rejected',
        'connection_removed',
        'publication_uploaded',
        'publication_updated',
        'publication_commented',
        'publication_recommended',
        'publication_bookmarked',
        'publication_shared',
        'publication_cited',
        'dataset_shared',
        'project_invitation',
        'collaboration_invitation',
        'mention',
        'system',
        'admin'
      ],
      index: true
    },
    title: {
      type: String,
      required: true
    },
    message: {
      type: String,
      required: true
    },
    targetType: {
      type: String,
      enum: ['User', 'Publication', 'Dataset', 'Project', 'ConnectionRequest', 'Comment', 'System'],
      required: true
    },
    targetId: {
      type: Schema.Types.ObjectId,
      required: true
    },
    targetUrl: {
      type: String,
      default: ''
    },
    metadata: {
      type: Map,
      of: Schema.Types.Mixed
    },
    isRead: {
      type: Boolean,
      default: false,
      index: true
    }
  },
  {
    timestamps: true
  }
);

// Optimize sorting and unread retrieval
NotificationSchema.index({ recipientId: 1, isRead: 1, createdAt: -1 });
NotificationSchema.index({ recipientId: 1, createdAt: -1 });

module.exports = mongoose.model('Notification', NotificationSchema);
