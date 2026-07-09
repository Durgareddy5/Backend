const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const PatentSchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    title: {
      type: String,
      required: [true, 'Patent title is required'],
      trim: true
    },
    patentNumber: {
      type: String,
      trim: true,
      default: ''
    },
    inventors: {
      type: String, // Comma separated list of inventors
      trim: true,
      default: ''
    },
    issueDate: {
      type: String, // e.g. "2024-03-15"
      trim: true,
      default: ''
    },
    description: {
      type: String,
      trim: true,
      default: ''
    },
    url: {
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

const Patent = mongoose.model('Patent', PatentSchema);
module.exports = Patent;
