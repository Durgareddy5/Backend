const BaseRepository = require('../../../common/repository/base.repository');
const Feed = require('../../../models/Feed');
const Like = require('../../../models/Like');
const Bookmark = require('../../../models/Bookmark');
const Comment = require('../../../models/Comment');
const Share = require('../../../models/Share');
const Recommendation = require('../../../models/Recommendation');
const Publication = require('../../../models/Publication');
const ResearchQuestion = require('../../../models/ResearchQuestion');
const Project = require('../../../models/Project');
const Event = require('../../../models/Event');
const Follow = require('../../../models/Follow');
const Dataset = require('../../../models/Dataset');
const User = require('../../../models/User');

class FeedRepository extends BaseRepository {
  constructor() {
    super(Feed);
  }

  async getFeedByUserId(userId) {
    return await this.model.findOne({ userId, isDeleted: { $ne: true } })
      .populate({
        path: 'publications.publicationId',
        model: 'Publication',
        populate: {
          path: 'userId',
          model: 'User',
          select: 'name email profileImage institution designation'
        }
      })
      .lean();
  }

  async getPublications(filter = {}, options = {}) {
    const { page = 1, limit = 10, sort = '-createdAt' } = options;
    const skip = (page - 1) * limit;
    
    const query = Publication.find({ ...filter, isDeleted: { $ne: true } })
      .populate('userId', 'firstName lastName fullName email profileImage institution department designation')
      .sort(sort)
      .skip(skip)
      .limit(Number(limit))
      .lean();

    const [docs, total] = await Promise.all([
      query,
      Publication.countDocuments({ ...filter, isDeleted: { $ne: true } })
    ]);

    return {
      docs,
      total,
      page: Number(page),
      limit: Number(limit),
      totalPages: Math.ceil(total / limit)
    };
  }

  async createPublication(pubData) {
    return await Publication.create(pubData);
  }

  async updatePublication(id, pubData) {
    return await Publication.findByIdAndUpdate(id, pubData, { new: true });
  }

  async deletePublication(id) {
    const PublicationAuthor = require('../../../models/PublicationAuthor');
    const PublicationFile = require('../../../models/PublicationFile');
    const PublicationKeyword = require('../../../models/PublicationKeyword');
    const PublicationResearchArea = require('../../../models/PublicationResearchArea');
    const PublicationMetric = require('../../../models/PublicationMetric');
    const PublicationAnalytic = require('../../../models/PublicationAnalytic');
    const PublicationView = require('../../../models/PublicationView');
    const PublicationDownload = require('../../../models/PublicationDownload');
    const PublicationBookmark = require('../../../models/PublicationBookmark');
    const PublicationComment = require('../../../models/PublicationComment');
    const PublicationHistory = require('../../../models/PublicationHistory');
    const PublicationMetadata = require('../../../models/PublicationMetadata');
    const PublicationReader = require('../../../models/PublicationReader');

    await Publication.deleteOne({ _id: id });
    await PublicationFile.deleteMany({ publicationId: id });
    await PublicationAuthor.deleteMany({ publicationId: id });
    await PublicationKeyword.deleteMany({ publicationId: id });
    await PublicationResearchArea.deleteMany({ publicationId: id });
    await PublicationMetric.deleteMany({ publicationId: id });
    await PublicationAnalytic.deleteMany({ publicationId: id });
    await PublicationView.deleteMany({ publicationId: id });
    await PublicationDownload.deleteMany({ publicationId: id });
    await PublicationBookmark.deleteMany({ publicationId: id });
    await PublicationComment.deleteMany({ publicationId: id });
    await PublicationHistory.deleteMany({ publicationId: id });
    if (PublicationMetadata) await PublicationMetadata.deleteMany({ publicationId: id });
    if (PublicationReader) await PublicationReader.deleteMany({ publicationId: id });

    return { _id: id };
  }

  async getPublicationById(id) {
    return await Publication.findById(id)
      .populate('userId', 'firstName lastName fullName email profileImage institution department designation')
      .lean();
  }

  async createLike(userId, publicationId) {
    return await Like.findOneAndUpdate(
      { userId, publicationId },
      { isDeleted: false },
      { upsert: true, new: true }
    );
  }

  async deleteLike(userId, publicationId) {
    return await Like.findOneAndUpdate(
      { userId, publicationId },
      { isDeleted: true },
      { new: true }
    );
  }

  async getLike(userId, publicationId) {
    return await Like.findOne({ userId, publicationId, isDeleted: { $ne: true } });
  }

  async createBookmark(userId, publicationId, folderName = 'General', isPrivate = true) {
    return await Bookmark.findOneAndUpdate(
      { userId, publicationId },
      { folderName, isPrivate, isDeleted: false },
      { upsert: true, new: true }
    );
  }

  async deleteBookmark(userId, publicationId) {
    return await Bookmark.findOneAndUpdate(
      { userId, publicationId },
      { isDeleted: true },
      { new: true }
    );
  }

  async getBookmark(userId, publicationId) {
    return await Bookmark.findOne({ userId, publicationId, isDeleted: { $ne: true } }).lean();
  }

  async getBookmarksByUserId(userId, filter = {}) {
    return await Bookmark.find({ userId, ...filter, isDeleted: { $ne: true } })
      .populate('publicationId')
      .lean();
  }

  async createComment(commentData) {
    return await Comment.create(commentData);
  }

  async getCommentsByPublicationId(publicationId, options = {}) {
    // Get top-level comments (parentId is null)
    const docs = await Comment.find({ publicationId, parentId: null, isDeleted: { $ne: true } })
      .populate('userId', 'firstName lastName fullName email profileImage')
      .sort('-createdAt')
      .lean();

    // For each comment, fetch its nested replies recursively
    const commentsWithReplies = await Promise.all(docs.map(async (comment) => {
      const replies = await this.getRepliesRecursively(comment._id);
      return {
        ...comment,
        replies
      };
    }));

    return {
      docs: commentsWithReplies,
      total: commentsWithReplies.length
    };
  }

  async getRepliesRecursively(commentId) {
    const replies = await Comment.find({ parentId: commentId, isDeleted: { $ne: true } })
      .populate('userId', 'firstName lastName fullName email profileImage')
      .sort('createdAt')
      .lean();

    const repliesWithNested = await Promise.all(replies.map(async (reply) => {
      const nestedReplies = await this.getRepliesRecursively(reply._id);
      return {
        ...reply,
        replies: nestedReplies
      };
    }));

    return repliesWithNested;
  }

  async createShare(shareData) {
    return await Share.create(shareData);
  }

  async countLikes(publicationId) {
    return await Like.countDocuments({ publicationId, isDeleted: { $ne: true } });
  }

  async countBookmarks(publicationId) {
    return await Bookmark.countDocuments({ publicationId, isDeleted: { $ne: true } });
  }

  async countComments(publicationId) {
    return await Comment.countDocuments({ publicationId, isDeleted: { $ne: true } });
  }

  async getResearchQuestions(filter = {}, options = {}) {
    const { page = 1, limit = 10, sort = '-createdAt', search = '' } = options;
    const skip = (page - 1) * limit;

    const queryFilter = { ...filter, isDeleted: { $ne: true } };
    if (search) {
      queryFilter.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }

    const query = ResearchQuestion.find(queryFilter)
      .populate('userId', 'firstName lastName fullName email profileImage institution designation')
      .sort(sort)
      .skip(skip)
      .limit(Number(limit))
      .lean();

    const [docs, total] = await Promise.all([
      query,
      ResearchQuestion.countDocuments(queryFilter)
    ]);

    return {
      docs,
      total,
      page: Number(page),
      limit: Number(limit),
      totalPages: Math.ceil(total / limit)
    };
  }

  async getProjects(filter = {}, options = {}) {
    const { page = 1, limit = 10, sort = '-createdAt', search = '' } = options;
    const skip = (page - 1) * limit;

    const queryFilter = { ...filter, isDeleted: { $ne: true } };
    if (search) {
      queryFilter.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }

    const query = Project.find(queryFilter)
      .populate('userId', 'firstName lastName fullName email profileImage institution designation')
      .populate('collaborators', 'firstName lastName fullName email profileImage')
      .sort(sort)
      .skip(skip)
      .limit(Number(limit))
      .lean();

    const [docs, total] = await Promise.all([
      query,
      Project.countDocuments(queryFilter)
    ]);

    return {
      docs,
      total,
      page: Number(page),
      limit: Number(limit),
      totalPages: Math.ceil(total / limit)
    };
  }

  async getDatasets(filter = {}, options = {}) {
    const { page = 1, limit = 10, sort = '-createdAt', search = '' } = options;
    const skip = (page - 1) * limit;

    const queryFilter = { ...filter, isDeleted: { $ne: true } };
    if (search) {
      queryFilter.title = { $regex: search, $options: 'i' };
    }

    const query = Dataset.find(queryFilter)
      .populate('userId', 'firstName lastName fullName email profileImage institution designation')
      .sort(sort)
      .skip(skip)
      .limit(Number(limit))
      .lean();

    const [docs, total] = await Promise.all([
      query,
      Dataset.countDocuments(queryFilter)
    ]);

    return {
      docs,
      total,
      page: Number(page),
      limit: Number(limit),
      totalPages: Math.ceil(total / limit)
    };
  }

  async getEvents(filter = {}, options = {}) {
    const { page = 1, limit = 10, sort = 'date' } = options;
    const skip = (page - 1) * limit;

    const query = Event.find({ ...filter, isDeleted: { $ne: true } })
      .sort(sort)
      .skip(skip)
      .limit(Number(limit))
      .lean();

    const [docs, total] = await Promise.all([
      query,
      Event.countDocuments({ ...filter, isDeleted: { $ne: true } })
    ]);

    return {
      docs,
      total,
      page: Number(page),
      limit: Number(limit),
      totalPages: Math.ceil(total / limit)
    };
  }

  // Follow mechanisms
  async createFollow(followerId, followingId) {
    return await Follow.findOneAndUpdate(
      { followerId, followingId },
      {},
      { upsert: true, new: true }
    );
  }

  async deleteFollow(followerId, followingId) {
    return await Follow.deleteOne({ followerId, followingId });
  }

  async isFollowing(followerId, followingId) {
    return await Follow.exists({ followerId, followingId });
  }

  async getFollowingList(followerId) {
    return await Follow.find({ followerId }).populate('followingId', 'firstName lastName fullName email profileImage institution department designation').lean();
  }

  async getFollowersList(followingId) {
    return await Follow.find({ followingId }).populate('followerId', 'firstName lastName fullName email profileImage institution department designation').lean();
  }

  async createRecommendation(userId, publicationId) {
    return await Recommendation.findOneAndUpdate(
      { userId, publicationId },
      { isDeleted: false },
      { upsert: true, new: true }
    );
  }

  async deleteRecommendation(userId, publicationId) {
    return await Recommendation.findOneAndUpdate(
      { userId, publicationId },
      { isDeleted: true },
      { new: true }
    );
  }

  async getRecommendation(userId, publicationId) {
    return await Recommendation.findOne({ userId, publicationId, isDeleted: { $ne: true } }).lean();
  }

  async countRecommendations(publicationId) {
    return await Recommendation.countDocuments({ publicationId, isDeleted: { $ne: true } });
  }
}

module.exports = new FeedRepository();
