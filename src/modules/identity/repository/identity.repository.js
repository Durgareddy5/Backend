const BaseRepository = require('../../../common/repository/base.repository');
const ResearchIdentity = require('../../../models/ResearchIdentity');

class IdentityRepository extends BaseRepository {
  constructor() {
    super(ResearchIdentity);
  }

  async findByUserId(userId) {
    return await this.findOne({ userId });
  }
}

module.exports = new IdentityRepository();
