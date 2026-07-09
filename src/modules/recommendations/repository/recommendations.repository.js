const BaseRepository = require('../../../common/repository/base.repository');
const RecommendationScore = require('../../../models/RecommendationScore');
const RecommendationProfile = require('../../../models/RecommendationProfile');
const ResearchGraph = require('../../../models/ResearchGraph');
const RecommendationHistory = require('../../../models/RecommendationHistory');

class RecommendationsRepository extends BaseRepository {
  constructor() {
    super(RecommendationScore);
    this.profileModel = RecommendationProfile;
    this.graphModel = ResearchGraph;
    this.historyModel = RecommendationHistory;
  }

  async getProfileByUserId(userId) {
    return await this.profileModel.findOne({ userId, isDeleted: { $ne: true } }).lean();
  }

  async saveProfile(userId, profileData) {
    return await this.profileModel.findOneAndUpdate(
      { userId },
      { ...profileData, isDeleted: false },
      { upsert: true, new: true }
    );
  }

  async getRecommendationScores(userId, targetType, queryOptions = {}) {
    const { page = 1, limit = 10, cursor } = queryOptions;
    
    // Base filter
    const filter = {
      userId,
      targetType,
      isDeleted: { $ne: true }
    };

    // If cursor is provided, support cursor pagination
    // Cursor format: "score_id"
    if (cursor) {
      const [scoreStr, idStr] = cursor.split('_');
      const scoreVal = parseFloat(scoreStr);
      if (!isNaN(scoreVal)) {
        filter.$or = [
          { score: { $lt: scoreVal } },
          { score: scoreVal, _id: { $lt: idStr } }
        ];
      }
    }

    const query = this.model.find(filter)
      .sort({ score: -1, _id: -1 })
      .limit(Number(limit))
      .lean();

    const docs = await query;
    const nextCursor = docs.length === Number(limit) 
      ? `${docs[docs.length - 1].score}_${docs[docs.length - 1]._id}` 
      : null;

    return {
      docs,
      nextCursor,
      limit: Number(limit)
    };
  }

  async saveRecommendationScore(userId, targetId, targetType, score, reasons) {
    return await this.model.findOneAndUpdate(
      { userId, targetId, targetType },
      { score, reasons, isDeleted: false },
      { upsert: true, new: true }
    );
  }

  async recordHistory(userId, targetId, targetType, action) {
    return await this.historyModel.create({
      userId,
      targetId,
      targetType,
      action
    });
  }

  async getInteractedTargetIds(userId, targetType, actions = ['dismiss', 'accept']) {
    const history = await this.historyModel.find({
      userId,
      targetType,
      action: { $in: actions },
      isDeleted: { $ne: true }
    }).select('targetId').lean();
    return history.map(h => h.targetId.toString());
  }

  async addGraphEdge(sourceId, sourceType, targetId, targetType, edgeType, weight = 1.0) {
    return await this.graphModel.findOneAndUpdate(
      { sourceId, targetId, edgeType },
      { sourceType, targetType, weight, isDeleted: false },
      { upsert: true, new: true }
    );
  }

  async getGraphEdges(sourceId, edgeType) {
    const filter = { sourceId, isDeleted: { $ne: true } };
    if (edgeType) filter.edgeType = edgeType;
    return await this.graphModel.find(filter).lean();
  }
}

module.exports = new RecommendationsRepository();
