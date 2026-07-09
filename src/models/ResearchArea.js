const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const ResearchAreaSchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    name: {
      type: String,
      required: true,
      trim: true
    },
    topics: [
      {
        type: String,
        trim: true
      }
    ],
    domains: [
      {
        type: String,
        trim: true
      }
    ]
  },
  {
    timestamps: true
  }
);

ResearchAreaSchema.index({ userId: 1, name: 1 }, { unique: true });

const ResearchArea = mongoose.model('ResearchArea', ResearchAreaSchema);

module.exports = ResearchArea;
