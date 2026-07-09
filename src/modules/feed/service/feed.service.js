const feedRepository = require('../repository/feed.repository');
const CoAuthor = require('../../../models/CoAuthor');
const Profile = require('../../../models/Profile');
const Publication = require('../../../models/Publication');
const FeedInteraction = require('../../../models/FeedInteraction');
const User = require('../../../models/User');
const Follow = require('../../../models/Follow');
const Bookmark = require('../../../models/Bookmark');
const Dataset = require('../../../models/Dataset');
const Comment = require('../../../models/Comment');
const Connection = require('../../../models/Connection');
const FeedEvent = require('../../../models/FeedEvent');
const FeedRanking = require('../../../models/FeedRanking');
const rankingEngine = require('../ranking/feed.ranking');
const {
  buildPersonalizedPipeline,
  buildFollowingPipeline,
  buildTrendingPipeline,
  buildLatestPipeline,
  buildTrendingAreasPipeline
} = require('../aggregation/feed.aggregation');

class FeedService {
  async generatePersonalizedFeed(userId, options = {}) {
    const { page = 1, limit = 10 } = options;
    const cacheKey = `personalized:${userId}:${page}:${limit}`;
    const { FeedCache } = require('../../../cache/cache.service');

    const cachedFeed = await FeedCache.get(cacheKey);
    if (cachedFeed) {
      return cachedFeed;
    }

    // Fetch user's profile, co-authors and people they follow to personalize
    const [userProfile, coauthors, followingDocs] = await Promise.all([
      Profile.findOne({ userId }).lean(),
      CoAuthor.find({ userId }).lean(),
      Follow.find({ followerId: userId }).lean()
    ]);

    const followingIds = followingDocs.map(f => f.followingId.toString());
    const connectedAuthorNames = coauthors.map(c => c.name.toLowerCase());
    const userInterests = userProfile ? (userProfile.skills.map(s => s.name.toLowerCase()).concat(
      userProfile.education.map(e => e.specialization.toLowerCase())
    )) : [];

    // Query all publications
    const publicationsResponse = await feedRepository.getPublications({}, { page: 1, limit: 100 });
    const publications = publicationsResponse.docs;

    // Score each publication
    const scoredPublications = publications.map(pub => {
      let score = 0;
      
      // Connection Scoring
      const authorIdStr = pub.userId?._id?.toString() || pub.userId?.toString();
      if (followingIds.includes(authorIdStr)) {
        score += 60; // Following the author directly is top priority!
      }

      const firstAuthor = pub.authors ? pub.authors.split(',')[0].trim().toLowerCase() : '';
      if (connectedAuthorNames.some(name => name.includes(firstAuthor) || firstAuthor.includes(name))) {
        score += 40; // Co-author connection
      }

      if (authorIdStr === userId.toString()) {
        score += 5; // User's own publications
      }

      // Demographic Overlaps
      if (userProfile && pub.userId) {
        if (pub.userId.institution && userProfile.institution && 
            pub.userId.institution.toLowerCase() === userProfile.institution.toLowerCase()) {
          score += 15; // Same institution
        }
        if (pub.userId.department && userProfile.department && 
            pub.userId.department.toLowerCase() === userProfile.department.toLowerCase()) {
          score += 10; // Same department
        }
      }

      // Interest & Topic Scoring
      if (pub.keywords && pub.keywords.length > 0 && userInterests.length > 0) {
        pub.keywords.forEach(kw => {
          if (userInterests.includes(kw.toLowerCase())) {
            score += 12; // Keyword match
          }
        });
      }

      // Popularity Weighting (Trending)
      const likesWeight = (pub.citations || 0) * 1.5;
      const readsWeight = (pub.views || 0) * 0.1;
      const downloadsWeight = (pub.downloads || 0) * 0.5;
      score += likesWeight + readsWeight + downloadsWeight;

      return {
        publication: pub,
        score
      };
    });

    // Sort by score descending
    scoredPublications.sort((a, b) => b.score - a.score);

    // Paginate results
    const total = scoredPublications.length;
    const startIndex = (page - 1) * limit;
    const paginated = scoredPublications.slice(startIndex, startIndex + Number(limit)).map(item => item.publication);

    const result = {
      docs: paginated,
      total,
      page: Number(page),
      limit: Number(limit),
      totalPages: Math.ceil(total / limit)
    };

    await FeedCache.set(cacheKey, result, 120); // 2 minute cache
    return result;
  }

  async getTrendingFeed(options = {}) {
    const { page = 1, limit = 10 } = options;
    const cacheKey = `trending:${page}:${limit}`;
    const { FeedCache } = require('../../../cache/cache.service');

    const cached = await FeedCache.get(cacheKey);
    if (cached) return cached;

    const result = await feedRepository.getPublications({}, { ...options, sort: '-views -downloads -citations' });
    await FeedCache.set(cacheKey, result, 120); // 2 minute cache
    return result;
  }

  async getLatestFeed(options = {}) {
    const { page = 1, limit = 10 } = options;
    const cacheKey = `latest:${page}:${limit}`;
    const { FeedCache } = require('../../../cache/cache.service');

    const cached = await FeedCache.get(cacheKey);
    if (cached) return cached;

    const result = await feedRepository.getPublications({}, { ...options, sort: '-createdAt' });
    await FeedCache.set(cacheKey, result, 60); // 1 minute cache
    return result;
  }

  async getFollowingFeed(userId, options = {}) {
    const { page = 1, limit = 10 } = options;
    const cacheKey = `following:${userId}:${page}:${limit}`;
    const { FeedCache } = require('../../../cache/cache.service');

    const cached = await FeedCache.get(cacheKey);
    if (cached) return cached;

    // Find researchers followed by the user
    const followingDocs = await Follow.find({ followerId: userId }).lean();
    const followingIds = followingDocs.map(f => f.followingId);

    if (followingIds.length === 0) {
      const emptyResult = { docs: [], total: 0, page: Number(page), limit: Number(limit), totalPages: 0 };
      await FeedCache.set(cacheKey, emptyResult, 60);
      return emptyResult;
    }

    const result = await feedRepository.getPublications({ userId: { $in: followingIds } }, options);
    await FeedCache.set(cacheKey, result, 60); // 1 minute cache
    return result;
  }

  // Publication CRUD
  async createPublication(userId, pubData) {
    // Calculate approximate reading time (1 min per 150 words in abstract)
    const abstractWords = pubData.abstract ? pubData.abstract.split(/\s+/).length : 0;
    const readingTime = Math.max(1, Math.ceil(abstractWords / 150));

    // Calculate initial research score
    const researchScore = 20 + Math.floor(Math.random() * 10);

    // Generate basic AI analysis structure if missing
    const aiAnalysis = pubData.aiAnalysis || {
      summary: `AI generated synopsis for "${pubData.title}": This research introduces a methodology targeting ${pubData.keywords?.join(', ') || 'specialist concepts'}.`,
      researchGap: 'Current models do not generalize well across different multi-modal environments.',
      futureWork: 'Future experiments should scale this architecture to larger neural layers.',
      methodology: 'Iterative optimization combined with self-attention networks.',
      keyFindings: 'Achieves higher precision with reduced compute latency.',
      noveltyScore: 7,
      difficultyLevel: 'Advanced'
    };

    const publication = await feedRepository.createPublication({
      ...pubData,
      userId,
      readingTime,
      researchScore,
      aiAnalysis
    });

    // Recalculate profile metrics after new publication
    await this.recalculateResearchScore(userId);

    // Flush cache to ensure feed lists reflect the new publication
    const { cacheService } = require('../../../cache/cache.service');
    await cacheService.flush();

    return publication;
  }

  async updatePublication(userId, id, pubData) {
    const publication = await feedRepository.getPublicationById(id);
    if (!publication) return null;
    
    // Check ownership
    if (publication.userId._id.toString() !== userId.toString()) {
      throw new Error('Not authorized to update this publication.');
    }

    const updated = await feedRepository.updatePublication(id, pubData);
    
    // Flush cache on update
    const { cacheService } = require('../../../cache/cache.service');
    await cacheService.flush();

    return updated;
  }

  async deletePublication(userId, id) {
    const publication = await feedRepository.getPublicationById(id);
    if (!publication) return null;

    if (publication.userId._id.toString() !== userId.toString()) {
      throw new Error('Not authorized to delete this publication.');
    }

    const deleted = await feedRepository.deletePublication(id);
    await this.recalculateResearchScore(userId);

    // Flush cache on deletion
    const { cacheService } = require('../../../cache/cache.service');
    await cacheService.flush();

    return deleted;
  }

  async getPublicationById(id, userId) {
    const publication = await feedRepository.getPublicationById(id);
    if (!publication) return null;

    // Increment view count
    publication.views = (publication.views || 0) + 1;
    await publication.save();

    // Track interaction
    if (userId) {
      await FeedInteraction.create({
        userId,
        publicationId: id,
        interactionType: 'click'
      });
    }

    const [liked, bookmarked, recommended] = await Promise.all([
      userId ? feedRepository.getLike(userId, id) : null,
      userId ? feedRepository.getBookmark(userId, id) : null,
      userId ? feedRepository.getRecommendation(userId, id) : null
    ]);

    const likesCount = await feedRepository.countLikes(id);
    const bookmarksCount = await feedRepository.countBookmarks(id);
    const recommendationsCount = await feedRepository.countRecommendations(id);
    const commentsCount = await feedRepository.countComments(id);

    return {
      ...publication.toObject(),
      likesCount,
      bookmarksCount,
      recommendationsCount,
      commentsCount,
      liked: !!liked,
      bookmarked: !!bookmarked,
      recommended: !!recommended
    };
  }

  // Follow Mechanisms
  async toggleFollow(followerId, followingId) {
    if (followerId.toString() === followingId.toString()) {
      throw new Error('You cannot follow yourself.');
    }

    const existing = await feedRepository.isFollowing(followerId, followingId);
    if (existing) {
      await feedRepository.deleteFollow(followerId, followingId);
      return { following: false };
    } else {
      await feedRepository.createFollow(followerId, followingId);
      return { following: true };
    }
  }

  async getSuggestedResearchers(userId) {
    const userProfile = await Profile.findOne({ userId });
    const followingDocs = await Follow.find({ followerId: userId });
    const followingIds = followingDocs.map(f => f.followingId.toString());

    // Query all profiles of other researchers
    const allProfiles = await Profile.find({ userId: { $ne: userId } }).populate('userId', 'firstName lastName fullName email profileImage institution department designation');
    const userSkills = userProfile ? userProfile.skills.map(s => s.name.toLowerCase()) : [];

    const suggestions = allProfiles.map(p => {
      let matchScore = 0;
      
      // Calculate overlap skills
      const otherSkills = p.skills ? p.skills.map(s => s.name.toLowerCase()) : [];
      const overlaps = otherSkills.filter(s => userSkills.includes(s));
      matchScore += overlaps.length * 10;

      // Same institution
      if (userProfile && p.institution && userProfile.institution && 
          p.institution.toLowerCase() === userProfile.institution.toLowerCase()) {
        matchScore += 15;
      }

      return {
        profile: p,
        matchScore,
        mutualInterests: overlaps
      };
    });

    // Remove already followed users and sort by score
    const filtered = suggestions
      .filter(item => !followingIds.includes(item.profile.userId?._id?.toString()))
      .sort((a, b) => b.matchScore - a.matchScore)
      .slice(0, 5);

    return filtered.map(item => ({
      userId: item.profile.userId?._id,
      name: item.profile.userId?.fullName || `${item.profile.userId?.firstName} ${item.profile.userId?.lastName}`,
      avatar: item.profile.profileImage || item.profile.userId?.profileImage,
      institution: item.profile.institution,
      department: item.profile.department,
      mutualInterests: item.mutualInterests,
      designation: item.profile.designation
    }));
  }

  // Bookmark Folder management
  async toggleBookmark(userId, publicationId, folderName = 'General', isPrivate = true) {
    const existing = await feedRepository.getBookmark(userId, publicationId);
    if (existing) {
      await feedRepository.deleteBookmark(userId, publicationId);
      await this.recalculateResearchScore(userId);
      return { bookmarked: false };
    } else {
      await feedRepository.createBookmark(userId, publicationId, folderName, isPrivate);
      await this.recalculateResearchScore(userId);
      return { bookmarked: true, folderName };
    }
  }

  async moveBookmark(userId, publicationId, folderName) {
    const bookmark = await Bookmark.findOne({ userId, publicationId, isDeleted: { $ne: true } });
    if (!bookmark) throw new Error('Bookmark not found.');

    bookmark.folderName = folderName;
    await bookmark.save();
    return bookmark;
  }

  async getBookmarkFolders(userId) {
    const bookmarks = await Bookmark.find({ userId, isDeleted: { $ne: true } });
    const folders = [...new Set(bookmarks.map(b => b.folderName))];
    return folders;
  }

  // Nested comments and replies
  async addComment(commentData) {
    const comment = await feedRepository.createComment(commentData);
    return comment;
  }

  async toggleLikeComment(userId, commentId) {
    const comment = await Comment.findById(commentId);
    if (!comment) throw new Error('Comment not found');

    const likedIdx = comment.likes.indexOf(userId);
    let liked = false;
    if (likedIdx > -1) {
      comment.likes.splice(likedIdx, 1);
    } else {
      comment.likes.push(userId);
      liked = true;
    }
    await comment.save();
    return { liked, likesCount: comment.likes.length };
  }

  // Similar papers helper
  async findSimilarPapers(publicationId) {
    const pub = await Publication.findById(publicationId);
    if (!pub) return [];

    const similar = await Publication.find({
      _id: { $ne: publicationId },
      keywords: { $in: pub.keywords },
      isDeleted: { $ne: true }
    }).limit(3);

    return similar;
  }

  // Recalculates user's research score dynamically
  async recalculateResearchScore(userId) {
    const profile = await Profile.findOne({ userId });
    if (!profile) return;

    const userPublications = await Publication.find({ userId, isDeleted: { $ne: true } });
    
    let totalCitations = 0;
    let totalViews = 0;
    let totalDownloads = 0;
    let totalScorePoints = 0;

    userPublications.forEach(pub => {
      totalCitations += (pub.citations || 0);
      totalViews += (pub.views || 0);
      totalDownloads += (pub.downloads || 0);
    });

    const followCount = await Follow.countDocuments({ followingId: userId });
    const bookmarkCount = await Bookmark.countDocuments({ userId, isDeleted: { $ne: true } });

    // Core formula: citations + views/10 + downloads/2 + follows*2 + publications*5
    totalScorePoints = totalCitations * 1.5 + (totalViews / 10) + (totalDownloads * 0.5) + (followCount * 2) + (userPublications.length * 5) + (bookmarkCount * 0.5);
    const scoreRounded = Math.min(99, Math.round(totalScorePoints));

    profile.metrics = {
      ...profile.metrics,
      totalCitations,
      downloadsCount: totalDownloads,
      viewsCount: totalViews,
      researchScore: scoreRounded
    };

    await profile.save();
  }

  // ═══════════════════════════════════════════════════════════
  // PHASE 8 — ACTIVITY FEED ENGINE
  // ═══════════════════════════════════════════════════════════

  /**
   * Record a new activity event into the FeedEvent collection.
   * Called by other modules (publication upload, follow, community post, etc.)
   */
  async recordFeedEvent({ actorId, eventType, entityType, entityId, metadata = {} }) {
    try {
      const event = await FeedEvent.create({
        actorId,
        eventType,
        entityType,
        entityId,
        metadata
      });
      return event;
    } catch (err) {
      // Non-critical — log but never throw to caller
      console.error('[FeedService] recordFeedEvent error:', err.message);
      return null;
    }
  }

  /**
   * Build or refresh per-user ranking context cache.
   */
  async _buildUserContext(userId) {
    // Check cache first
    let ranking = await FeedRanking.findOne({ userId }).lean();
    const cacheStale = !ranking || (Date.now() - new Date(ranking.lastComputedAt).getTime() > 5 * 60 * 1000);

    if (!cacheStale) return ranking;

    const [profile, followingDocs, connections] = await Promise.all([
      Profile.findOne({ userId }).lean(),
      Follow.find({ followerId: userId }).select('followingId').lean(),
      Connection.find({
        $or: [{ senderId: userId }, { receiverId: userId }],
        status: 'accepted'
      }).lean()
    ]);

    const followingIds = followingDocs.map(f => f.followingId);
    const connectionIds = connections.map(c =>
      c.senderId.toString() === userId.toString() ? c.receiverId : c.senderId
    );

    const researchInterests = [];
    if (profile) {
      (profile.skills || []).forEach(s => researchInterests.push(s.name?.toLowerCase()));
      (profile.education || []).forEach(e => e.specialization && researchInterests.push(e.specialization.toLowerCase()));
      (profile.researchAreas || []).forEach(r => r.name && researchInterests.push(r.name.toLowerCase()));
    }

    const context = {
      userId,
      followingIds,
      connectionIds,
      collaborationIds: [],
      researchInterests: [...new Set(researchInterests.filter(Boolean))],
      institution: profile?.institution || '',
      country: profile?.country || '',
      lastComputedAt: new Date()
    };

    await FeedRanking.findOneAndUpdate(
      { userId },
      context,
      { upsert: true, new: true }
    );

    return context;
  }

  /**
   * Personalized multi-type activity feed.
   * Uses cursor-based pagination for performance.
   */
  async getActivityFeed(userId, { cursor, limit = 20 } = {}) {
    const userContext = await this._buildUserContext(userId);
    const pipeline = buildPersonalizedPipeline({
      followingIds: userContext.followingIds,
      cursor,
      limit: Number(limit)
    });

    if (!pipeline.length) return { events: [], nextCursor: null };

    const events = await FeedEvent.aggregate(pipeline);
    const ranked = rankingEngine.rankEvents(events, userContext);
    const nextCursor = ranked.length === Number(limit) ? ranked[ranked.length - 1]._id : null;
    return { events: ranked, nextCursor };
  }

  /**
   * Following-only activity feed.
   */
  async getActivityFeedFollowing(userId, { cursor, limit = 20 } = {}) {
    const userContext = await this._buildUserContext(userId);
    const { followingIds } = userContext;

    if (!followingIds.length) return { events: [], nextCursor: null };

    const pipeline = buildFollowingPipeline({ followingIds, cursor, limit: Number(limit) });
    const events = await FeedEvent.aggregate(pipeline);
    const ranked = rankingEngine.rankEvents(events, userContext);
    const nextCursor = ranked.length === Number(limit) ? ranked[ranked.length - 1]._id : null;
    return { events: ranked, nextCursor };
  }

  /**
   * Trending feed — high-engagement events in 24h window.
   */
  async getActivityFeedTrending({ cursor, limit = 20, windowHours = 24 } = {}) {
    const pipeline = buildTrendingPipeline({ cursor, limit: Number(limit), windowHours });
    const events = await FeedEvent.aggregate(pipeline);
    const nextCursor = events.length === Number(limit) ? events[events.length - 1]._id : null;
    return { events, nextCursor };
  }

  /**
   * Latest (chronological) feed.
   */
  async getActivityFeedLatest({ cursor, limit = 20 } = {}) {
    const pipeline = buildLatestPipeline({ cursor, limit: Number(limit) });
    const events = await FeedEvent.aggregate(pipeline);
    const nextCursor = events.length === Number(limit) ? events[events.length - 1]._id : null;
    return { events, nextCursor };
  }

  /**
   * Sidebar bundle — all widget data in one request.
   */
  async getFeedSidebar(userId) {
    const [trendingAreas, suggestedResearchers] = await Promise.all([
      FeedEvent.aggregate(buildTrendingAreasPipeline({ limit: 5, windowHours: 48 })),
      this.getSuggestedResearchers(userId)
    ]);

    // Upcoming conferences (from Event collection via repository)
    let conferences = [];
    let funding = [];
    let jobs = [];
    try {
      const eventsRes = await feedRepository.getEvents({}, { page: 1, limit: 5 });
      conferences = eventsRes?.docs || [];
    } catch (_) {}

    // Funding opportunities from FeedEvent collection
    try {
      funding = await FeedEvent.find({ eventType: 'funding_opportunity', isDeleted: { $ne: true } })
        .sort({ createdAt: -1 })
        .limit(5)
        .lean();
    } catch (_) {}

    // Academic jobs from FeedEvent collection
    try {
      jobs = await FeedEvent.find({ eventType: 'academic_job', isDeleted: { $ne: true } })
        .sort({ createdAt: -1 })
        .limit(5)
        .lean();
    } catch (_) {}

    return {
      trendingAreas,
      suggestedResearchers,
      conferences,
      funding,
      jobs
    };
  }

  /**
   * Record user interaction with a feed event (impression, click, bookmark, like).
   */
  async recordEventInteraction(userId, eventId, interactionType) {
    try {
      await FeedInteraction.create({
        userId,
        publicationId: eventId, // Reuse existing schema — eventId stored in publicationId field
        interactionType
      });

      // Increment engagement counters on FeedEvent for trending/ranking
      const incrementMap = {
        like: 'engagementCount.likes',
        comment: 'engagementCount.comments',
        share: 'engagementCount.shares',
        bookmark: 'engagementCount.bookmarks'
      };
      if (incrementMap[interactionType]) {
        await FeedEvent.findByIdAndUpdate(eventId, {
          $inc: { [incrementMap[interactionType]]: 1 }
        });
      }
      return { recorded: true };
    } catch (err) {
      console.error('[FeedService] recordEventInteraction error:', err.message);
      return { recorded: false };
    }
  }
}

module.exports = new FeedService();
