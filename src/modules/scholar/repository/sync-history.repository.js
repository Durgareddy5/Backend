const BaseRepository = require('../../../common/repository/base.repository');
const SyncHistory = require('../../../models/SyncHistory');

class SyncHistoryRepository extends BaseRepository {
  constructor() {
    super(SyncHistory);
  }

  async findByUserId(userId) {
    return await this.model.find({ userId }).sort({ createdAt: -1 });
  }
}

module.exports = new SyncHistoryRepository();
