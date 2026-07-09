const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const KeywordSchema = new Schema(
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
    count: {
      type: Number,
      default: 1
    }
  },
  {
    timestamps: true
  }
);

KeywordSchema.index({ userId: 1, name: 1 }, { unique: true });

const Keyword = mongoose.model('Keyword', KeywordSchema);

module.exports = Keyword;
