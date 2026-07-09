const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const CertificateSchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    name: {
      type: String,
      required: [true, 'Certification name is required'],
      trim: true
    },
    organization: {
      type: String,
      required: [true, 'Issuing organization is required'],
      trim: true
    },
    issueDate: {
      type: String, // e.g. "2023-08"
      trim: true,
      default: ''
    },
    credentialUrl: {
      type: String,
      trim: true,
      default: ''
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

const Certificate = mongoose.model('Certificate', CertificateSchema);
module.exports = Certificate;
