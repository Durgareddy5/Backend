const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const DerivedAnalyticsSchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
      index: true
    },
    totalPublications: {
      type: Number,
      default: 0
    },
    journalPapers: {
      type: Number,
      default: 0
    },
    conferencePapers: {
      type: Number,
      default: 0
    },
    averageCitations: {
      type: Number,
      default: 0
    },
    averagePublicationsPerYear: {
      type: Number,
      default: 0
    },
    mostActiveResearchYear: {
      type: Number
    },
    mostCitedPublication: {
      type: Schema.Types.ObjectId,
      ref: 'Publication'
    },
    mostCitedPublicationTitle: {
      type: String,
      default: ''
    },
    mostCitedPublicationCitations: {
      type: Number,
      default: 0
    },
    mostFrequentKeyword: {
      type: String,
      default: ''
    },
    topResearchDomain: {
      type: String,
      default: ''
    },
    researchExperience: {
      type: Number,
      default: 0
    },
    citationGrowthRate: {
      type: Number,
      default: 0
    },
    publicationGrowthRate: {
      type: Number,
      default: 0
    },
    trendingResearchArea: {
      type: String,
      default: ''
    },
    latestPublication: {
      type: Schema.Types.ObjectId,
      ref: 'Publication'
    },
    latestPublicationTitle: {
      type: String,
      default: ''
    },
    oldestPublication: {
      type: Schema.Types.ObjectId,
      ref: 'Publication'
    },
    oldestPublicationTitle: {
      type: String,
      default: ''
    },
    researchScore: {
      type: Number,
      default: 0
    }
  },
  {
    timestamps: true
  }
);

const DerivedAnalytics = mongoose.model('DerivedAnalytics', DerivedAnalyticsSchema);
module.exports = DerivedAnalytics;
