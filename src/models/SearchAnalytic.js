const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const SearchAnalyticSchema = new Schema(
  {
    query: {
      type: String,
      required: true,
      trim: true
    },
    normalizedQuery: {
      type: String,
      trim: true,
      lowercase: true,
      index: true
    },
    hitCount: {
      type: Number,
      default: 1
    },
    searchType: {
      type: String,
      enum: ['all', 'publications', 'authors', 'journals', 'conferences'],
      default: 'all'
    },
    lastSearchedAt: {
      type: Date,
      default: Date.now
    }
  },
  {
    timestamps: true,
    collection: 'searchAnalytics'
  }
);

// Compound unique on normalizedQuery + searchType so we can upsert cleanly
SearchAnalyticSchema.index({ normalizedQuery: 1, searchType: 1 }, { unique: true });
SearchAnalyticSchema.index({ hitCount: -1 });

module.exports = mongoose.model('SearchAnalytic', SearchAnalyticSchema);
