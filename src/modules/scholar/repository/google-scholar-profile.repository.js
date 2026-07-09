const BaseRepository = require('../../../common/repository/base.repository');
const GoogleScholarProfile = require('../../../models/GoogleScholarProfile');

class GoogleScholarProfileRepository extends BaseRepository {
  constructor() {
    super(GoogleScholarProfile);
  }

  async findByUserId(userId) {
    return await this.model.findOne({ userId, isDeleted: { $ne: true } });
  }

  async findByAuthorId(authorId) {
    return await this.model.findOne({ authorId, isDeleted: { $ne: true } });
  }
}

module.exports = new GoogleScholarProfileRepository();
