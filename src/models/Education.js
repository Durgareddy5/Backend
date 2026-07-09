const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const EducationSchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    degree: {
      type: String,
      required: [true, 'Degree is required'],
      trim: true
    },
    university: {
      type: String,
      required: [true, 'University is required'],
      trim: true
    },
    duration: {
      type: String,
      required: [true, 'Duration is required'], // e.g. "2018 - 2022"
      trim: true
    },
    cgpa: {
      type: String,
      trim: true,
      default: ''
    },
    specialization: {
      type: String,
      trim: true,
      default: ''
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

const Education = mongoose.model('Education', EducationSchema);
module.exports = Education;
