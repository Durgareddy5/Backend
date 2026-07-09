const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const PublicationResearchAreaSchema = new Schema(
  {
    publicationId: {
      type: Schema.Types.ObjectId,
      ref: 'Publication',
      required: true,
      index: true
    },
    researchArea: {
      type: String,
      required: true,
      trim: true,
      index: true
    }
  },
  {
    timestamps: true,
    collection: 'publicationResearchAreas'
  }
);

// Compound index to avoid duplicate research area mappings
PublicationResearchAreaSchema.index({ publicationId: 1, researchArea: 1 }, { unique: true });

const PublicationResearchArea = mongoose.model('PublicationResearchArea', PublicationResearchAreaSchema);

module.exports = PublicationResearchArea;
