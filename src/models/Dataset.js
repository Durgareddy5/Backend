const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const DatasetSchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: [200, 'Dataset title cannot exceed 200 characters']
    },
    description: {
      type: String,
      required: true,
      trim: true
    },
    url: {
      type: String,
      default: ''
    },
    size: {
      type: String, // e.g. "4.2 GB", "150 MB"
      default: ''
    },
    format: {
      type: String, // e.g. "CSV", "JSON", "HDF5"
      default: ''
    },
    downloads: {
      type: Number,
      default: 0
    },
    views: {
      type: Number,
      default: 0
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

const Dataset = mongoose.model('Dataset', DatasetSchema);

module.exports = Dataset;
