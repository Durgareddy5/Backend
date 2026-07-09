const mongoose = require('mongoose');
const Schema = mongoose.Schema;

/**
 * FeedEvent — Central activity stream document.
 * Every system action that should appear in the feed generates one FeedEvent.
 * Supports multi-type activity: publications, follows,
 * conferences, funding, datasets, jobs, announcements, milestones.
 */
const FeedEventSchema = new Schema(
  {
    // Who performed the action
    actorId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },

    // What type of event occurred
    eventType: {
      type: String,
      enum: [
        'publication_uploaded',
        'publication_updated',
        'citation_increased',
        'dataset_uploaded',
        'project_created',
        'patent_published',
        'book_published',
        'conference_joined',
        'conference_deadline',
        'research_question',
        'research_answer',
        'funding_opportunity',
        'academic_job',
        'research_collaboration',
        'milestone',
        'award',
        'achievement',
        'researcher_followed'
      ],
      required: true,
      index: true
    },

    // The type of entity this event is about
    entityType: {
      type: String,
      enum: [
        'Publication',
        'Dataset',
        'Project',
        'Patent',
        'Conference',
        'Collaboration',
        'ResearchQuestion',
        'User',
        'FundingOpportunity',
        'AcademicJob',
        'Announcement'
      ],
      required: true
    },

    // The actual entity document _id
    entityId: {
      type: Schema.Types.ObjectId,
      required: true,
      index: true
    },

    // Flexible metadata bucket (title, abstract, institution, etc.)
    metadata: {
      title: String,
      subtitle: String,
      abstract: String,
      institution: String,
      department: String,
      country: String,
      researchArea: String,
      keywords: [String],
      journal: String,
      conference: String,
      citations: { type: Number, default: 0 },
      views: { type: Number, default: 0 },
      downloads: { type: Number, default: 0 },
      grantAmount: String,
      deadline: Date,
      location: String,
      applyUrl: String,
      imageUrl: String,
      tags: [String],
      slug: String,
      profileSlug: String,
      avatar: String,
      followers: { type: Number, default: 0 },
      publications: { type: Number, default: 0 }
    },

    // Pre-computed relevance score (updated by ranking engine)
    score: {
      type: Number,
      default: 0,
      index: true
    },

    // Target audience — which user IDs should see this in their personalized feed
    // If empty: global / public event
    targetAudience: [
      {
        type: Schema.Types.ObjectId,
        ref: 'User'
      }
    ],

    // Engagement counters (denormalized for ranking speed)
    engagementCount: {
      likes: { type: Number, default: 0 },
      comments: { type: Number, default: 0 },
      shares: { type: Number, default: 0 },
      bookmarks: { type: Number, default: 0 }
    },

    // TTL in seconds — 0 means permanent
    ttlSeconds: {
      type: Number,
      default: 0
    },

    // Soft delete
    isDeleted: {
      type: Boolean,
      default: false,
      index: true
    }
  },
  {
    timestamps: true
  }
);

// Compound indexes for efficient feed queries
FeedEventSchema.index({ eventType: 1, createdAt: -1 });
FeedEventSchema.index({ actorId: 1, createdAt: -1 });
FeedEventSchema.index({ score: -1, createdAt: -1 });
FeedEventSchema.index({ isDeleted: 1, createdAt: -1 });
FeedEventSchema.index({ 'metadata.keywords': 1 });

const FeedEvent = mongoose.model('FeedEvent', FeedEventSchema);

module.exports = FeedEvent;
