const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const SystemConfigurationSchema = new Schema(
  {
    key: {
      type: String,
      required: [true, 'Configuration key is required'],
      unique: true,
      trim: true
    },
    value: {
      type: Schema.Types.Mixed,
      required: [true, 'Configuration value is required']
    },
    description: {
      type: String,
      trim: true,
      default: ''
    },
    category: {
      type: String,
      trim: true,
      default: 'general'
    },
    updatedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null
    }
  },
  {
    timestamps: true
  }
);

// Indexes
SystemConfigurationSchema.index({ category: 1 });

const SystemConfiguration = mongoose.model('SystemConfiguration', SystemConfigurationSchema);

module.exports = SystemConfiguration;
