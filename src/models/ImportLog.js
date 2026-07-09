const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const ImportLogSchema = new Schema(
  {
    importId: {
      type: Schema.Types.ObjectId,
      ref: 'Import',
      required: true,
      index: true
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    level: {
      type: String,
      enum: ['info', 'warn', 'error'],
      default: 'info'
    },
    message: {
      type: String,
      required: true
    },
    timestamp: {
      type: Date,
      default: Date.now
    }
  },
  {
    timestamps: true
  }
);

ImportLogSchema.index({ importId: 1, createdAt: 1 });

const ImportLog = mongoose.model('ImportLog', ImportLogSchema);

module.exports = ImportLog;
