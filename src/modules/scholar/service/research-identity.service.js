const Profile = require('../../../models/Profile');
const User = require('../../../models/User');
const { ValidationError, NotFoundError } = require('../../../common/errors/AppError');

class ResearchIdentityService {
  async saveResearchIdentity(userId, data) {
    const profile = await Profile.findOne({ userId, isDeleted: { $ne: true } });
    if (!profile) {
      throw new NotFoundError('Profile not found.');
    }

    // Save fields into profile's socialLinks
    profile.socialLinks = {
      orcid: data.orcid !== undefined ? data.orcid : profile.socialLinks?.orcid || '',
      googleScholar: data.googleScholar !== undefined ? data.googleScholar : profile.socialLinks?.googleScholar || '',
      researchGate: data.researchGate !== undefined ? data.researchGate : profile.socialLinks?.researchGate || '',
      linkedin: data.linkedin !== undefined ? data.linkedin : profile.socialLinks?.linkedin || '',
      scopus: data.scopus !== undefined ? data.scopus : profile.socialLinks?.scopus || '',
      website: profile.socialLinks?.website || ''
    };

    // Save fields into separate SocialLink collection to maintain compatibility
    const SocialLink = require('../../../models/SocialLink');
    await SocialLink.findOneAndUpdate(
      { userId },
      {
        userId,
        orcid: profile.socialLinks.orcid,
        googleScholar: profile.socialLinks.googleScholar,
        researchGate: profile.socialLinks.researchGate,
        linkedin: profile.socialLinks.linkedin,
        scopus: profile.socialLinks.scopus,
        website: profile.socialLinks.website
      },
      { upsert: true, new: true }
    );

    // Set user type as academic if they complete identities
    const user = await User.findById(userId).select('+password');
    if (user && user.researcherType === 'non_researcher') {
      user.researcherType = 'academic';
      user.status = 'active';
      user.isActive = true;
      await user.save();
    }

    await profile.save();
    return profile;
  }
}

module.exports = new ResearchIdentityService();
