const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const EventSchema = new Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true
    },
    description: {
      type: String,
      trim: true
    },
    type: {
      type: String,
      enum: ['Conference', 'Funding', 'Webinar', 'Meeting'],
      required: true
    },
    date: {
      type: Date,
      required: true
    },
    link: {
      type: String,
      default: ''
    },
    organization: {
      type: String,
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

EventSchema.index({ date: 1 });

const Event = mongoose.model('Event', EventSchema);

module.exports = Event;
