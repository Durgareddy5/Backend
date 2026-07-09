const BaseRepository = require('../../../common/repository/base.repository');
const Profile = require('../../../models/Profile');

class ProfileRepository extends BaseRepository {
  constructor() {
    super(Profile);
  }

  async findByUserId(userId) {
    return await this.model.findOne({ userId, isDeleted: { $ne: true } });
  }
}

module.exports = new ProfileRepository();
