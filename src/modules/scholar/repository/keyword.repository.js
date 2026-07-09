const BaseRepository = require('../../../common/repository/base.repository');
const Keyword = require('../../../models/Keyword');

class KeywordRepository extends BaseRepository {
  constructor() {
    super(Keyword);
  }

  async findByUserId(userId) {
    return await this.model.find({ userId }).sort({ count: -1 });
  }

  async deleteByUserId(userId) {
    return await this.model.deleteMany({ userId });
  }
}

module.exports = new KeywordRepository();
