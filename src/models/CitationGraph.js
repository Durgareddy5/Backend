const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const CitationGraphSchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    year: {
      type: Number,
      required: true
    },
    citations: {
      type: Number,
      required: true,
      default: 0
    }
  },
  {
    timestamps: true
  }
);

CitationGraphSchema.index({ userId: 1, year: 1 }, { unique: true });

const CitationGraph = mongoose.model('CitationGraph', CitationGraphSchema);

module.exports = CitationGraph;
