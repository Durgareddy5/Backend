const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const BookSchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    title: {
      type: String,
      required: [true, 'Book title is required'],
      trim: true
    },
    authors: {
      type: String, // Comma separated list of authors
      trim: true,
      default: ''
    },
    publisher: {
      type: String,
      trim: true,
      default: ''
    },
    year: {
      type: Number,
      index: true
    },
    isbn: {
      type: String,
      trim: true,
      default: ''
    },
    description: {
      type: String,
      trim: true,
      default: ''
    },
    url: {
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

const Book = mongoose.model('Book', BookSchema);
module.exports = Book;
