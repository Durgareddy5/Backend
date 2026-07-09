const BaseRepository = require('../../../common/repository/base.repository');
const Import = require('../../../models/Import');

class ImportRepository extends BaseRepository {
  constructor() {
    super(Import);
  }

  async findActiveImportByUserId(userId, provider = 'google_scholar') {
    return await this.model.findOne({
      userId,
      provider,
      status: { $in: ['pending', 'running'] }
    }).sort({ createdAt: -1 });
  }

  async findLastCompletedByUserId(userId, provider = 'google_scholar') {
    return await this.model.findOne({
      userId,
      provider,
      status: 'completed'
    }).sort({ completedAt: -1 });
  }

  async findNextPendingJob() {
    return await this.model.findOne({ status: 'pending' }).sort({ createdAt: 1 });
  }
}

module.exports = new ImportRepository();
