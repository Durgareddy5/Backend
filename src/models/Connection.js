const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const ConnectionSchema = new Schema(
  {
    researcherA: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    researcherB: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    connectedAt: {
      type: Date,
      default: Date.now
    }
  },
  {
    timestamps: true
  }
);

// Unique compound index. To enforce uniqueness correctly, researcherA should always be < researcherB.
ConnectionSchema.index({ researcherA: 1, researcherB: 1 }, { unique: true });

const Connection = mongoose.model('Connection', ConnectionSchema);

module.exports = Connection;
