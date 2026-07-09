const BaseRepository = require('../../../common/repository/base.repository');
const DerivedAnalytics = require('../../../models/DerivedAnalytics');

class DerivedAnalyticsRepository extends BaseRepository {
  constructor() {
    super(DerivedAnalytics);
  }

  async findByUserId(userId) {
    return await this.model.findOne({ userId });
  }
}

module.exports = new DerivedAnalyticsRepository();
