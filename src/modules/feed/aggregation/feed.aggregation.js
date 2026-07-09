const mongoose = require('mongoose');

/**
 * FeedAggregation — MongoDB aggregation pipeline builders.
 * Each builder returns a pipeline array ready to pass to FeedEvent.aggregate().
 *
 * All pipelines use cursor-based pagination for performance.
 * Deduplication is handled via $group on _id.
 */

/**
 * Standard lookup/projection stages shared across pipelines.
 */
const actorLookup = [
  {
    $lookup: {
      from: 'users',
      localField: 'actorId',
      foreignField: '_id',
      as: 'actor',
      pipeline: [
        {
          $project: {
            _id: 1,
            firstName: 1,
            lastName: 1,
            username: 1,
            profileImage: 1,
            institution: 1,
            designation: 1,
            profileSlug: 1
          }
        }
      ]
    }
  },
  { $unwind: { path: '$actor', preserveNullAndEmpty: true } }
];

const baseMatch = (extra = {}) => ({
  $match: {
    isDeleted: { $ne: true },
    ...extra
  }
});

const cursorStage = (cursor) => {
  if (!cursor) return null;
  try {
    const cursorId = new mongoose.Types.ObjectId(cursor);
    return { $match: { _id: { $lt: cursorId } } };
  } catch {
    return null;
  }
};

const sortByRecency = { $sort: { _id: -1 } };
const sortByScore = { $sort: { score: -1, _id: -1 } };

/**
 * Personalized feed pipeline.
 * Events from followed users + all public events, scored and cursor-paginated.
 */
function buildPersonalizedPipeline({ followingIds = [], cursor, limit = 20 }) {
  const pipeline = [
    baseMatch(),
  ];

  const cursorMatch = cursorStage(cursor);
  if (cursorMatch) pipeline.push(cursorMatch);

  pipeline.push(
    ...actorLookup,
    sortByScore,
    { $limit: limit },
    {
      $project: {
        _id: 1,
        eventType: 1,
        entityType: 1,
        entityId: 1,
        metadata: 1,
        score: 1,
        engagementCount: 1,
        createdAt: 1,
        actor: 1,
        targetAudience: 1
      }
    }
  );

  return pipeline;
}

/**
 * Following-only feed pipeline.
 * Events where actorId is in the user's following list.
 */
function buildFollowingPipeline({ followingIds = [], cursor, limit = 20 }) {
  if (!followingIds.length) return [];

  const followingObjectIds = followingIds
    .map(id => {
      try { return new mongoose.Types.ObjectId(id); } catch { return null; }
    })
    .filter(Boolean);

  const pipeline = [
    { $match: { isDeleted: { $ne: true }, actorId: { $in: followingObjectIds } } }
  ];

  const cursorMatch = cursorStage(cursor);
  if (cursorMatch) pipeline.push(cursorMatch);

  pipeline.push(
    ...actorLookup,
    sortByRecency,
    { $limit: limit },
    {
      $project: {
        _id: 1, eventType: 1, entityType: 1, entityId: 1,
        metadata: 1, score: 1, engagementCount: 1, createdAt: 1, actor: 1
      }
    }
  );

  return pipeline;
}

/**
 * Trending pipeline — high-engagement events in recent time window.
 */
function buildTrendingPipeline({ cursor, limit = 20, windowHours = 24 }) {
  const windowStart = new Date(Date.now() - windowHours * 60 * 60 * 1000);

  const pipeline = [
    {
      $match: {
        isDeleted: { $ne: true },
        createdAt: { $gte: windowStart }
      }
    }
  ];

  const cursorMatch = cursorStage(cursor);
  if (cursorMatch) pipeline.push(cursorMatch);

  pipeline.push(
    // Compute trending score inline
    {
      $addFields: {
        trendingScore: {
          $add: [
            { $multiply: [{ $ifNull: ['$engagementCount.likes', 0] }, 2] },
            { $multiply: [{ $ifNull: ['$engagementCount.comments', 0] }, 3] },
            { $multiply: [{ $ifNull: ['$engagementCount.shares', 0] }, 4] },
            { $multiply: [{ $ifNull: ['$engagementCount.bookmarks', 0] }, 2] },
            { $multiply: [{ $ifNull: ['$metadata.views', 0] }, 0.1] },
            { $multiply: [{ $ifNull: ['$metadata.citations', 0] }, 1.5] }
          ]
        }
      }
    },
    { $sort: { trendingScore: -1, _id: -1 } },
    { $limit: limit },
    ...actorLookup,
    {
      $project: {
        _id: 1, eventType: 1, entityType: 1, entityId: 1,
        metadata: 1, engagementCount: 1, trendingScore: 1, createdAt: 1, actor: 1
      }
    }
  );

  return pipeline;
}

/**
 * Latest (chronological) pipeline.
 */
function buildLatestPipeline({ cursor, limit = 20 }) {
  const pipeline = [baseMatch()];

  const cursorMatch = cursorStage(cursor);
  if (cursorMatch) pipeline.push(cursorMatch);

  pipeline.push(
    ...actorLookup,
    sortByRecency,
    { $limit: limit },
    {
      $project: {
        _id: 1, eventType: 1, entityType: 1, entityId: 1,
        metadata: 1, engagementCount: 1, createdAt: 1, actor: 1
      }
    }
  );

  return pipeline;
}

/**
 * Sidebar aggregation pipeline — fetches trending research areas.
 */
function buildTrendingAreasPipeline({ limit = 5, windowHours = 48 }) {
  const windowStart = new Date(Date.now() - windowHours * 60 * 60 * 1000);
  return [
    { $match: { isDeleted: { $ne: true }, createdAt: { $gte: windowStart }, 'metadata.researchArea': { $exists: true, $ne: '' } } },
    { $group: { _id: '$metadata.researchArea', count: { $sum: 1 }, totalEngagement: { $sum: { $add: [{ $ifNull: ['$engagementCount.likes', 0] }, { $ifNull: ['$engagementCount.shares', 0] }] } } } },
    { $sort: { count: -1, totalEngagement: -1 } },
    { $limit: limit },
    { $project: { _id: 0, area: '$_id', count: 1, totalEngagement: 1 } }
  ];
}

module.exports = {
  buildPersonalizedPipeline,
  buildFollowingPipeline,
  buildTrendingPipeline,
  buildLatestPipeline,
  buildTrendingAreasPipeline
};
