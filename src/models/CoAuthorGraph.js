const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const CoAuthorGraphSchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
      index: true
    },
    coAuthorNetwork: [
      {
        name: { type: String, required: true },
        affiliation: { type: String, default: '' },
        count: { type: Number, default: 1 } // Number of co-authored publications
      }
    ],
    institutionGraph: [
      {
        name: { type: String, required: true },
        count: { type: Number, default: 1 }
      }
    ],
    researchAreaGraph: [
      {
        name: { type: String, required: true },
        count: { type: Number, default: 1 }
      }
    ],
    collaborationTimeline: [
      {
        year: { type: Number, required: true },
        count: { type: Number, default: 1 }
      }
    ],
    isDeleted: {
      type: Boolean,
      default: false,
      index: true
    }
  },
  {
    timestamps: true,
    collection: 'coAuthorGraphs'
  }
);

const CoAuthorGraph = mongoose.model('CoAuthorGraph', CoAuthorGraphSchema);
module.exports = CoAuthorGraph;
