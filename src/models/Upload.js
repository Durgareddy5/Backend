const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const UploadSchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    purpose: {
      type: String,
      required: true,
      index: true,
      enum: [
        'profile-avatar',
        'profile-banner',
        'publication-pdf',
        'publication-cover',
        'dataset',
        'poster',
        'presentation',
        'research-image',
        'certificate',
        'project-image',
        'institution-logo',
        'research-document',
        'patent-document',
        'book-cover',
        'thesis'
      ]
    },
    resourceId: {
      type: String,
      index: true,
      default: ''
    },
    asset_id: {
      type: String,
      required: true,
      unique: true,
      index: true
    },
    public_id: {
      type: String,
      required: true,
      unique: true,
      index: true
    },
    secure_url: {
      type: String,
      required: true
    },
    resource_type: {
      type: String,
      required: true,
      enum: ['image', 'raw', 'video', 'auto']
    },
    format: {
      type: String,
      default: ''
    },
    bytes: {
      type: Number,
      required: true
    },
    width: {
      type: Number
    },
    height: {
      type: Number
    },
    pages: {
      type: Number,
      default: 0
    },
    folder: {
      type: String,
      required: true
    },
    version: {
      type: String,
      required: true
    },
    original_filename: {
      type: String,
      default: ''
    },
    uploadedAt: {
      type: Date,
      default: Date.now,
      required: true
    },
    isDeleted: {
      type: Boolean,
      default: false,
      index: true
    },
    deletedAt: {
      type: Date
    }
  },
  {
    timestamps: true
  }
);

// Indexes for common queries
UploadSchema.index({ userId: 1, purpose: 1 });
UploadSchema.index({ resourceId: 1, purpose: 1 });

const Upload = mongoose.model('Upload', UploadSchema);

module.exports = Upload;
