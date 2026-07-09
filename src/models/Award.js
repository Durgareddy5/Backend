const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const AwardSchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    title: {
      type: String,
      required: [true, 'Award/Honor title is required'],
      trim: true
    },
    organization: {
      type: String,
      required: [true, 'Granting organization is required'],
      trim: true
    },
    year: {
      type: Number,
      required: [true, 'Year of grant is required'],
      index: true
    },
    description: {
      type: String,
      trim: true,
      default: ''
    },
    isDeleted: {
      type: Boolean,
      default: false
    }
  },
  {
    timestamps: true
  }
);

const Award = mongoose.model('Award', AwardSchema);
module.exports = Award;
