const BaseRepository = require('../../../common/repository/base.repository');
const Publication = require('../../../models/Publication');

class PublicationRepository extends BaseRepository {
  constructor() {
    super(Publication);
  }

  // Find a publication by slug including populating user details
  async findBySlug(slug, populate = 'userId', select = 'firstName lastName fullName email profileImage institution department designation') {
    let query = this.model.findOne({ slug, isDeleted: { $ne: true } });
    if (populate) {
      query = query.populate(populate, select);
    }
    return await query;
  }
}

module.exports = new PublicationRepository();
