const BaseRepository = require('../../../common/repository/base.repository');
const ResearchArea = require('../../../models/ResearchArea');

class ResearchAreaRepository extends BaseRepository {
  constructor() {
    super(ResearchArea);
  }

  async findByUserId(userId) {
    return await this.model.find({ userId });
  }

  async deleteByUserId(userId) {
    return await this.model.deleteMany({ userId });
  }
}

module.exports = new ResearchAreaRepository();
