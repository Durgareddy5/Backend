const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const SkillSchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    name: {
      type: String,
      required: [true, 'Skill name is required'],
      trim: true
    },
    category: {
      type: String,
      enum: ['Programming', 'AI', 'ML', 'Cloud', 'Research', 'Writing', 'Statistics', 'Other'],
      default: 'Other'
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

SkillSchema.index({ name: 1 });

const Skill = mongoose.model('Skill', SkillSchema);
module.exports = Skill;
