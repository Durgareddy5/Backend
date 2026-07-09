const feedService = require('../service/feed.service');
const feedRepository = require('../repository/feed.repository');
const asyncHandler = require('../../../common/middlewares/asyncHandler.middleware');
const Dataset = require('../../../models/Dataset');
const Notification = require('../../../models/Notification');

class FeedController {
  getFeed = asyncHandler(async (req, res) => {
    const { page = 1, limit = 10 } = req.query;
    const feed = await feedService.generatePersonalizedFeed(req.user._id, { page, limit });
    return res.success('Personalized research feed retrieved successfully.', feed);
  });

  getTrending = asyncHandler(async (req, res) => {
    const { page = 1, limit = 10 } = req.query;
    const feed = await feedService.getTrendingFeed({ page, limit });
    return res.success('Trending research feed retrieved successfully.', feed);
  });

  getRecommended = asyncHandler(async (req, res) => {
    const { page = 1, limit = 10 } = req.query;
    const feed = await feedService.generatePersonalizedFeed(req.user._id, { page, limit });
    return res.success('Recommended research feed retrieved successfully.', feed);
  });

  getLatest = asyncHandler(async (req, res) => {
    const { page = 1, limit = 10 } = req.query;
    const feed = await feedService.getLatestFeed({ page, limit });
    return res.success('Latest research feed retrieved successfully.', feed);
  });

  getFollowingFeed = asyncHandler(async (req, res) => {
    const { page = 1, limit = 10 } = req.query;
    const feed = await feedService.getFollowingFeed(req.user._id, { page, limit });
    return res.success('Following research feed retrieved successfully.', feed);
  });

  getPublicationById = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const pub = await feedService.getPublicationById(id, req.user ? req.user._id : null);
    if (!pub) {
      return res.error('Publication not found.', {}, 404);
    }
    return res.success('Publication details retrieved successfully.', pub);
  });

  // Publication CRUD
  createPublication = asyncHandler(async (req, res) => {
    const pub = await feedService.createPublication(req.user._id, req.body);
    return res.success('Publication created successfully.', pub, 201);
  });

  updatePublication = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const pub = await feedService.updatePublication(req.user._id, id, req.body);
    if (!pub) return res.error('Publication not found.', {}, 404);
    return res.success('Publication updated successfully.', pub);
  });

  deletePublication = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const deleted = await feedService.deletePublication(req.user._id, id);
    if (!deleted) return res.error('Publication not found.', {}, 404);
    return res.success('Publication deleted successfully.');
  });

  toggleLike = asyncHandler(async (req, res) => {
    const { publicationId } = req.body;
    if (!publicationId) return res.error('Publication ID is required.', {}, 400);
    const result = await feedService.toggleLike(req.user._id, publicationId);
    return res.success(result.liked ? 'Publication liked.' : 'Publication unliked.', result);
  });

  toggleBookmark = asyncHandler(async (req, res) => {
    const { publicationId, folderName, isPrivate } = req.body;
    if (!publicationId) return res.error('Publication ID is required.', {}, 400);
    const result = await feedService.toggleBookmark(req.user._id, publicationId, folderName, isPrivate);
    return res.success(result.bookmarked ? 'Publication bookmarked.' : 'Publication unbookmarked.', result);
  });

  moveBookmark = asyncHandler(async (req, res) => {
    const { publicationId, folderName } = req.body;
    if (!publicationId || !folderName) {
      return res.error('Publication ID and folderName are required.', {}, 400);
    }
    const result = await feedService.moveBookmark(req.user._id, publicationId, folderName);
    return res.success(`Bookmark moved to folder: ${folderName}`, result);
  });

  getBookmarkFolders = asyncHandler(async (req, res) => {
    const folders = await feedService.getBookmarkFolders(req.user._id);
    return res.success('Bookmark folders retrieved successfully.', folders);
  });

  toggleRecommendation = asyncHandler(async (req, res) => {
    const { publicationId } = req.body;
    if (!publicationId) return res.error('Publication ID is required.', {}, 400);
    const result = await feedService.toggleRecommendation(req.user._id, publicationId);
    return res.success(result.recommended ? 'Publication recommended.' : 'Publication recommendation removed.', result);
  });

  addComment = asyncHandler(async (req, res) => {
    const { publicationId, text, parentId } = req.body;
    if (!publicationId || !text) {
      return res.error('Publication ID and text are required.', {}, 400);
    }
    const comment = await feedService.addComment({
      userId: req.user._id,
      publicationId,
      text,
      parentId: parentId || null
    });
    return res.success('Comment posted successfully.', comment);
  });

  toggleLikeComment = asyncHandler(async (req, res) => {
    const { commentId } = req.params;
    const result = await feedService.toggleLikeComment(req.user._id, commentId);
    return res.success(result.liked ? 'Comment liked.' : 'Comment unliked.', result);
  });

  getComments = asyncHandler(async (req, res) => {
    const { publicationId } = req.params;
    const comments = await feedRepository.getCommentsByPublicationId(publicationId);
    return res.success('Comments with nested replies retrieved successfully.', comments);
  });

  recordShare = asyncHandler(async (req, res) => {
    const { publicationId, platform } = req.body;
    if (!publicationId) return res.error('Publication ID is required.', {}, 400);
    const share = await feedService.recordShare({
      userId: req.user._id,
      publicationId,
      platform
    });
    return res.success('Share recorded successfully.', share);
  });

  globalSearch = asyncHandler(async (req, res) => {
    const { query = '', page = 1, limit = 10 } = req.query;
    const results = await feedService.globalSearch(query, { page, limit });
    return res.success('Global search completed successfully.', results);
  });

  getQuestions = asyncHandler(async (req, res) => {
    const { page = 1, limit = 10, search = '' } = req.query;
    const questions = await feedRepository.getResearchQuestions({}, { page, limit, search });
    return res.success('Research questions retrieved successfully.', questions);
  });

  getProjects = asyncHandler(async (req, res) => {
    const { page = 1, limit = 10, search = '' } = req.query;
    const projects = await feedRepository.getProjects({}, { page, limit, search });
    return res.success('Research projects retrieved successfully.', projects);
  });

  getEvents = asyncHandler(async (req, res) => {
    const { page = 1, limit = 10 } = req.query;
    const events = await feedRepository.getEvents({}, { page, limit });
    return res.success('Events and conferences retrieved successfully.', events);
  });

  // Follow Actions
  toggleFollow = asyncHandler(async (req, res) => {
    const { userId } = req.params;
    const result = await feedService.toggleFollow(req.user._id, userId);
    return res.success(result.following ? 'User followed.' : 'User unfollowed.', result);
  });

  getSuggestedResearchers = asyncHandler(async (req, res) => {
    const suggestions = await feedService.getSuggestedResearchers(req.user._id);
    return res.success('Suggested researchers retrieved successfully.', suggestions);
  });

  getFollowingList = asyncHandler(async (req, res) => {
    const list = await feedRepository.getFollowingList(req.user._id);
    return res.success('Following list retrieved successfully.', list);
  });

  getFollowersList = asyncHandler(async (req, res) => {
    const list = await feedRepository.getFollowersList(req.user._id);
    return res.success('Followers list retrieved successfully.', list);
  });

  // AI & Extra endpoints
  getSimilarPapers = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const papers = await feedService.findSimilarPapers(id);
    return res.success('Similar papers retrieved successfully.', papers);
  });

  requestFullText = asyncHandler(async (req, res) => {
    const { publicationId } = req.body;
    if (!publicationId) return res.error('Publication ID is required.', {}, 400);

    const pub = await Publication.findById(publicationId);
    if (!pub) return res.error('Publication not found.', {}, 404);

    // Send notification to author
    await Notification.create({
      userId: pub.userId,
      title: 'Full Text Request',
      message: `${req.user.fullName} requested the full text for your publication: "${pub.title}".`,
      type: 'collaboration'
    });

    return res.success('Full text request sent to author successfully.');
  });

  getAiSummary = asyncHandler(async (req, res) => {
    const { publicationId } = req.body;
    const pub = await Publication.findById(publicationId);
    if (!pub) return res.error('Publication not found.', {}, 404);

    return res.success('AI analysis generated successfully.', pub.aiAnalysis);
  });

  // Dataset Endpoints
  createDataset = asyncHandler(async (req, res) => {
    const dataset = await Dataset.create({
      ...req.body,
      userId: req.user._id
    });
    return res.success('Dataset shared successfully.', dataset, 201);
  });

  getDatasets = asyncHandler(async (req, res) => {
    const { page = 1, limit = 10, search = '' } = req.query;
    const datasets = await feedRepository.getDatasets({}, { page, limit, search });
    return res.success('Shared datasets retrieved successfully.', datasets);
  });

  getHome = asyncHandler(async (req, res) => {
    return res.success('Home initial details retrieved successfully.', {
      welcomeMessage: `Welcome back, ${req.user.fullName || req.user.firstName}!`,
      userId: req.user._id,
      role: req.user.role
    });
  });

  getNotifications = asyncHandler(async (req, res) => {
    const list = await Notification.find({ userId: req.user._id }).sort('-createdAt').limit(20);
    return res.success('User notifications retrieved successfully.', list);
  });

  getMessages = asyncHandler(async (req, res) => {
    return res.success('Scholar channels retrieved successfully.', [
      { id: '1', title: 'NLP Research Group', lastMessage: 'sarah: Let\'s test the LaTeX tokenizer.' },
      { id: '2', title: 'NISQ Quantum Computing', lastMessage: 'david: The compiler is optimized.' }
    ]);
  });

  getRequests = asyncHandler(async (req, res) => {
    const list = await Notification.find({ userId: req.user._id, type: 'collaboration' }).sort('-createdAt').limit(10);
    return res.success('Pending connection requests retrieved successfully.', list);
  });

  getRecommendations = asyncHandler(async (req, res) => {
    const list = await feedService.getTrendingFeed({ page: 1, limit: 3 });
    return res.success('AI recommendations retrieved successfully.', list.docs);
  });

  // ═══════════════════════════════════════════════════════════
  // PHASE 8 — ACTIVITY FEED CONTROLLER METHODS
  // ═══════════════════════════════════════════════════════════

  getActivityFeed = asyncHandler(async (req, res) => {
    const { cursor, limit = 20 } = req.query;
    const result = await feedService.getActivityFeed(req.user._id, { cursor, limit });
    return res.success('Personalized activity feed retrieved successfully.', result);
  });

  getActivityFeedFollowing = asyncHandler(async (req, res) => {
    const { cursor, limit = 20 } = req.query;
    const result = await feedService.getActivityFeedFollowing(req.user._id, { cursor, limit });
    return res.success('Following activity feed retrieved successfully.', result);
  });

  getActivityFeedTrending = asyncHandler(async (req, res) => {
    const { cursor, limit = 20, windowHours = 24 } = req.query;
    const result = await feedService.getActivityFeedTrending({ cursor, limit, windowHours });
    return res.success('Trending activity feed retrieved successfully.', result);
  });

  getActivityFeedLatest = asyncHandler(async (req, res) => {
    const { cursor, limit = 20 } = req.query;
    const result = await feedService.getActivityFeedLatest({ cursor, limit });
    return res.success('Latest activity feed retrieved successfully.', result);
  });

  getFeedSidebar = asyncHandler(async (req, res) => {
    const result = await feedService.getFeedSidebar(req.user._id);
    return res.success('Feed sidebar data retrieved successfully.', result);
  });

  emitFeedEvent = asyncHandler(async (req, res) => {
    const { actorId, eventType, entityType, entityId, metadata } = req.body;
    if (!eventType || !entityType || !entityId) {
      return res.error('eventType, entityType, and entityId are required.', {}, 400);
    }
    const event = await feedService.recordFeedEvent({
      actorId: actorId || req.user._id,
      eventType,
      entityType,
      entityId,
      metadata
    });
    return res.success('Feed event recorded successfully.', event, 201);
  });

  recordFeedInteraction = asyncHandler(async (req, res) => {
    const { eventId, interactionType } = req.body;
    if (!eventId || !interactionType) {
      return res.error('eventId and interactionType are required.', {}, 400);
    }
    const result = await feedService.recordEventInteraction(req.user._id, eventId, interactionType);
    return res.success('Interaction recorded successfully.', result);
  });
}

module.exports = new FeedController();
