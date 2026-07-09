const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const ProjectSchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: [200, 'Project title cannot exceed 200 characters']
    },
    description: {
      type: String,
      required: true,
      trim: true
    },
    status: {
      type: String,
      enum: ['Ongoing', 'Completed', 'Proposed'],
      default: 'Ongoing'
    },
    collaborators: [
      {
        type: Schema.Types.ObjectId,
        ref: 'User'
      }
    ],
    researchAreas: [
      {
        type: String,
        trim: true
      }
    ],
    isDeleted: {
      type: Boolean,
      default: false
    }
  },
  {
    timestamps: true
  }
);

const Project = mongoose.model('Project', ProjectSchema);

module.exports = Project;
