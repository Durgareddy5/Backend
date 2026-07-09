const mongoose = require('mongoose');
const Schema = mongoose.Schema;

/**
 * PublicationMetadata
 * ===================
 * Stores the full result of metadata extraction from uploaded files.
 * Used both as a pre-save cache (isOrphan=true, before publication is created)
 * and as the linked metadata record (isOrphan=false, after publication is saved).
 *
 * Caching flow:
 *   1. POST /extract-metadata → save with isOrphan=true, return _id as cacheId
 *   2. POST /publish → findById(cacheId) → link publicationId → isOrphan=false
 */

const PublicationMetadataSchema = new Schema(
  {
    // Linked publication ObjectId (null if isOrphan=true)
    publicationId: {
      type: Schema.Types.ObjectId,
      ref: 'Publication',
      index: true,
      default: null
    },

    // The RCPUB_ publicationId string (set on upload, before MongoDB save)
    rcPublicationId: {
      type: String,
      index: true,
      default: null
    },

    // True when metadata was extracted and cached but not yet linked to a publication
    isOrphan: {
      type: Boolean,
      default: true,
      index: true
    },

    // First 50KB of raw extracted text (for debugging / re-extraction)
    rawText: {
      type: String,
      default: ''
    },

    // Original file information
    originalFileName: {
      type: String,
      default: ''
    },

    mimeType: {
      type: String,
      default: ''
    },

    fileSizeBytes: {
      type: Number,
      default: 0
    },

    // Extraction method used: 'pdf-parse' | 'pdf2json' | 'pdfreader' | 'tesseract-ocr' | 'mammoth' | 'text' | 'none'
    extractionMethod: {
      type: String,
      default: 'none'
    },

    // Extraction pipeline version
    extractionVersion: {
      type: String,
      default: '2.0.0'
    },

    extractionDate: {
      type: Date,
      default: Date.now
    },

    // Duration of extraction in milliseconds
    extractionDurationMs: {
      type: Number,
      default: 0
    },

    // Per-field confidence scores (0–100)
    confidenceScores: {
      title: { type: Number, default: 0 },
      abstract: { type: Number, default: 0 },
      authors: { type: Number, default: 0 },
      doi: { type: Number, default: 0 },
      journal: { type: Number, default: 0 },
      keywords: { type: Number, default: 0 },
      year: { type: Number, default: 0 },
      pages: { type: Number, default: 0 },
      publisher: { type: Number, default: 0 },
      language: { type: Number, default: 0 },
      conference: { type: Number, default: 0 },
      funding: { type: Number, default: 0 },
      references: { type: Number, default: 0 }
    },

    // Full structured extraction result (Schema.Mixed for flexibility)
    extractedMetadata: {
      type: Schema.Types.Mixed,
      default: {}
    },

    // Extracted field values stored flat for fast access
    abstract: { type: String, default: '' },
    references: [{ type: String, trim: true }],
    publisher: { type: String, default: '' },
    journal: { type: String, default: '' },
    conference: { type: String, default: '' },
    doi: { type: String, default: '' },
    isbn: { type: String, default: '' },
    issn: { type: String, default: '' },
    language: { type: String, default: 'English' },
    year: { type: Number, default: null },
    pages: { type: String, default: '' },
    volume: { type: String, default: '' },
    issue: { type: String, default: '' },
    funding: { type: String, default: '' },
    license: { type: String, default: '' },
    copyright: { type: String, default: '' },
    emails: [{ type: String }],
    orcids: [{ type: String }],

    // Custom extension fields (for future use)
    customFields: {
      type: Map,
      of: String
    }
  },
  {
    timestamps: true
  }
);

// Auto-expire orphan metadata after 24 hours (prevents cache buildup)
PublicationMetadataSchema.index(
  { createdAt: 1 },
  { expireAfterSeconds: 86400, partialFilterExpression: { isOrphan: true } }
);

const PublicationMetadata = mongoose.model('PublicationMetadata', PublicationMetadataSchema);

module.exports = PublicationMetadata;
