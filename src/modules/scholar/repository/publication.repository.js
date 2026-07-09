const BaseRepository = require('../../../common/repository/base.repository');
const Publication = require('../../../models/Publication');

class PublicationRepository extends BaseRepository {
  constructor() {
    super(Publication);
  }

  async findByUserId(userId, options = {}) {
    const { page = 1, limit = 10, sort = '-year', search = '' } = options;
    return await this.find(
      { userId },
      { page, limit, sort, search, searchFields: ['title', 'authors', 'publication', 'journal', 'conference', 'publisher'] }
    );
  }
}

module.exports = new PublicationRepository();
