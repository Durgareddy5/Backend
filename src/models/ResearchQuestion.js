const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const ResearchQuestionSchema = new Schema(
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
      maxlength: [200, 'Question title cannot exceed 200 characters']
    },
    description: {
      type: String,
      required: true,
      trim: true
    },
    researchAreas: [
      {
        type: String,
        trim: true
      }
    ],
    answers: [
      {
        userId: {
          type: Schema.Types.ObjectId,
          ref: 'User',
          required: true
        },
        text: {
          type: String,
          required: true,
          trim: true
        },
        createdAt: {
          type: Date,
          default: Date.now
        }
      }
    ],
    views: {
      type: Number,
      default: 0
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

ResearchQuestionSchema.index({ title: 'text', description: 'text' });

const ResearchQuestion = mongoose.model('ResearchQuestion', ResearchQuestionSchema);

module.exports = ResearchQuestion;
