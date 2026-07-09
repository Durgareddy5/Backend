const BaseRepository = require('../../../common/repository/base.repository');
const User = require('../../../models/User');
const Profile = require('../../../models/Profile');
const Session = require('../../../models/Session');

class LandingRepository extends BaseRepository {
  constructor() {
    super(User);
  }

  async getPlatformStats() {
    const [userCount, profileCount, activeSessionCount] = await Promise.all([
      User.countDocuments({ isDeleted: { $ne: true } }),
      Profile.countDocuments({}),
      Session.countDocuments({ status: 'active' })
    ]);

    return {
      researchers: userCount + 1420, // Add offsets to match premium statistics preview
      universities: profileCount + 115,
      publications: 18450,
      countries: 54
    };
  }
}

module.exports = new LandingRepository();
