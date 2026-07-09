const BaseRepository = require('../../../common/repository/base.repository');
const User = require('../../../models/User');

class AuthRepository extends BaseRepository {
  constructor() {
    super(User);
  }

  async findByEmail(email, selectPassword = false) {
    let query = this.model.findOne({ email: email.toLowerCase(), isDeleted: { $ne: true } });
    if (selectPassword) {
      query = query.select('+password');
    }
    return await query;
  }
}

module.exports = new AuthRepository();
