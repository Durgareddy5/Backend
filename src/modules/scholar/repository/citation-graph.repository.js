const BaseRepository = require('../../../common/repository/base.repository');
const CitationGraph = require('../../../models/CitationGraph');

class CitationGraphRepository extends BaseRepository {
  constructor() {
    super(CitationGraph);
  }

  async findByUserId(userId) {
    return await this.model.find({ userId }).sort({ year: 1 });
  }

  async deleteByUserId(userId) {
    return await this.model.deleteMany({ userId });
  }
}

module.exports = new CitationGraphRepository();
