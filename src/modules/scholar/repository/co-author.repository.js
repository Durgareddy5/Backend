const BaseRepository = require('../../../common/repository/base.repository');
const CoAuthor = require('../../../models/CoAuthor');

class CoAuthorRepository extends BaseRepository {
  constructor() {
    super(CoAuthor);
  }

  async findByUserId(userId) {
    return await this.model.find({ userId, isDeleted: { $ne: true } });
  }

  async deleteByUserId(userId) {
    return await this.model.deleteMany({ userId });
  }

  async findByAuthorId(userId, authorId) {
    return await this.model.findOne({ userId, authorId, isDeleted: { $ne: true } });
  }
}

module.exports = new CoAuthorRepository();
