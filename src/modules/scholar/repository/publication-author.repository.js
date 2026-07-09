const BaseRepository = require('../../../common/repository/base.repository');
const PublicationAuthor = require('../../../models/PublicationAuthor');

class PublicationAuthorRepository extends BaseRepository {
  constructor() {
    super(PublicationAuthor);
  }

  async findByPublicationId(publicationId) {
    return await this.model.find({ publicationId });
  }

  async deleteByPublicationId(publicationId) {
    return await this.model.deleteMany({ publicationId });
  }
}

module.exports = new PublicationAuthorRepository();
