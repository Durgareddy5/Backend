const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const SearchHistorySchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    query: {
      type: String,
      required: true,
      trim: true,
      maxlength: 500
    },
    filters: {
      type: Schema.Types.Mixed,
      default: {}
    },
    resultCount: {
      type: Number,
      default: 0
    },
    searchType: {
      type: String,
      enum: ['all', 'publications', 'authors', 'journals', 'conferences'],
      default: 'all'
    },
    isFavorite: {
      type: Boolean,
      default: false
    },
    isDeleted: {
      type: Boolean,
      default: false
    }
  },
  {
    timestamps: true,
    collection: 'searchHistories'
  }
);

SearchHistorySchema.index({ userId: 1, createdAt: -1 });
SearchHistorySchema.index({ userId: 1, isFavorite: 1 });
SearchHistorySchema.index({ userId: 1, query: 1 });

module.exports = mongoose.model('SearchHistory', SearchHistorySchema);
