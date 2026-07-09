const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const ResearchGraphSchema = new Schema(
  {
    sourceId: { type: Schema.Types.ObjectId, required: true, index: true },
    sourceType: { type: String, required: true, enum: ['User', 'Publication'] },
    targetId: { type: Schema.Types.ObjectId, required: true, index: true },
    targetType: { type: String, required: true, enum: ['User', 'Publication', 'Project'] },
    edgeType: { 
      type: String, 
      required: true, 
      enum: ['coauthor', 'citation', 'connection', 'contributor', 'member', 'follower'] 
    },
    weight: { type: Number, default: 1.0 },
    isDeleted: { type: Boolean, default: false }
  },
  {
    timestamps: true,
    collection: 'researchGraph'
  }
);

ResearchGraphSchema.index({ sourceId: 1, targetId: 1, edgeType: 1 }, { unique: true });
ResearchGraphSchema.index({ isDeleted: 1 });

module.exports = mongoose.model('ResearchGraph', ResearchGraphSchema);
