const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const ExperienceSchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    designation: {
      type: String,
      required: [true, 'Designation is required'],
      trim: true
    },
    institution: {
      type: String,
      required: [true, 'Institution/Company is required'],
      trim: true
    },
    duration: {
      type: String,
      required: [true, 'Duration is required'], // e.g. "2022 - Present"
      trim: true
    },
    description: {
      type: String,
      trim: true,
      default: ''
    },
    researchFocus: {
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

const Experience = mongoose.model('Experience', ExperienceSchema);
module.exports = Experience;
