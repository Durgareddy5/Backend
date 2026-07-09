const mongoose = require('mongoose');
const profileRepository = require('../repository/profile.repository');
const User = require('../../../models/User');
const Profile = require('../../../models/Profile');
const Education = require('../../../models/Education');
const Experience = require('../../../models/Experience');
const Skill = require('../../../models/Skill');
const Patent = require('../../../models/Patent');
const Book = require('../../../models/Book');
const Award = require('../../../models/Award');
const Certificate = require('../../../models/Certificate');
const SocialLink = require('../../../models/SocialLink');
const ProfileAnalytics = require('../../../models/ProfileAnalytics');
const ResearchMetric = require('../../../models/ResearchMetric');
const ProfileCompletion = require('../../../models/ProfileCompletion');
const Project = require('../../../models/Project');
const Dataset = require('../../../models/Dataset');
const ResearchArea = require('../../../models/ResearchArea');
const Keyword = require('../../../models/Keyword');
const Publication = require('../../../models/Publication');
const GoogleScholarProfile = require('../../../models/GoogleScholarProfile');
const CoAuthor = require('../../../models/CoAuthor');
const CitationGraph = require('../../../models/CitationGraph');
const DerivedAnalytics = require('../../../models/DerivedAnalytics');
const ActivityLog = require('../../../models/ActivityLog');
const Follow = require('../../../models/Follow');
const { NotFoundError, ValidationError } = require('../../../common/errors/AppError');

class ProfileService {
  async _syncCollection(Model, userId, items) {
    await Model.deleteMany({ userId });
    if (items && items.length > 0) {
      const formatted = items.map(item => {
        const cleaned = { ...item };
        delete cleaned._id;
        return { ...cleaned, userId };
      });
      await Model.insertMany(formatted);
    }
  }

  async getFullProfile(userId, isPublic = false) {
    const { ProfileCache } = require('../../../cache/cache.service');
    const cached = await ProfileCache.get(userId.toString());
    if (cached) {
      return cached;
    }

    const user = await User.findById(userId);
    if (!user || user.isDeleted) {
      throw new NotFoundError('User not found.');
    }

    let profile = await Profile.findOne({ userId, isDeleted: { $ne: true } });
    if (!profile) {
      profile = await Profile.create({ userId });
    }

    const [
      education, experience, skills, patents, books, datasets, awards, certificates,
      socialLinksObj, metricsObj, completionObj, researchAreas, keywords, publications,
      coAuthors, citationGraph, derivedAnalytics
    ] = await Promise.all([
      Education.find({ userId, isDeleted: { $ne: true } }).lean(),
      Experience.find({ userId, isDeleted: { $ne: true } }).lean(),
      Skill.find({ userId, isDeleted: { $ne: true } }).lean(),
      Patent.find({ userId, isDeleted: { $ne: true } }).lean(),
      Book.find({ userId, isDeleted: { $ne: true } }).lean(),
      Dataset.find({ userId, isDeleted: { $ne: true } }).lean(),
      Award.find({ userId, isDeleted: { $ne: true } }).lean(),
      Certificate.find({ userId, isDeleted: { $ne: true } }).lean(),
      SocialLink.findOne({ userId, isDeleted: { $ne: true } }).lean(),
      ResearchMetric.findOne({ userId, isDeleted: { $ne: true } }).lean(),
      ProfileCompletion.findOne({ userId }).lean(),
      ResearchArea.find({ userId }).lean(),
      Keyword.find({ userId }).sort({ count: -1 }).lean(),
      Publication.find({ userId, isDeleted: { $ne: true } }).sort({ year: -1, createdAt: -1 }).lean(),
      CoAuthor.find({ userId }).lean(),
      CitationGraph.find({ userId }).sort({ year: 1 }).lean(),
      DerivedAnalytics.findOne({ userId }).lean()
    ]);

    const socialLinks = socialLinksObj || profile.socialLinks || {
      orcid: '', googleScholar: '', researchGate: '', linkedin: '', website: '', scopus: ''
    };

    let profileCompletion = completionObj ? completionObj.percentage : 0;
    if (!completionObj) {
      profileCompletion = await this.calculateAndSaveProfileCompletion(userId);
    }

    let metrics = metricsObj ? (typeof metricsObj.toObject === 'function' ? metricsObj.toObject() : metricsObj) : null;
    if (!metricsObj) {
      const calculatedMetrics = await this.calculateAndSaveResearchMetrics(userId);
      metrics = calculatedMetrics && typeof calculatedMetrics.toObject === 'function' ? calculatedMetrics.toObject() : calculatedMetrics;
    }

    const result = {
      profileId: profile._id,
      userId: user._id,
      username: user.username || '',
      profileSlug: user.profileSlug || '',
      profileUrl: user.profileUrl || '',
      publicProfileUrl: user.publicProfileUrl || '',
      firstName: user.firstName,
      lastName: user.lastName,
      fullName: user.fullName || `${user.firstName} ${user.lastName}`,
      email: user.email,
      phone: user.phone || '',
      role: user.role,
      bio: profile.bio || '',
      displayName: profile.displayName || user.fullName || '',
      headline: profile.headline || '',
      // Default URL if empty
      coverImage: profile.coverImage || 'https://images.unsplash.com/photo-1550684848-fac1c5b4e853?q=80&w=1200',
      profileImage: profile.profileImage || user.profileImage || 'https://cdn.pixabay.com/photo/2015/10/05/22/37/blank-profile-picture-973460_1280.png',
      dateOfBirth: profile.dateOfBirth || '',
      nationality: profile.nationality || '',
      country: profile.country || user.country || '',
      state: profile.state || '',
      city: profile.city || '',
      institution: profile.institution || '',
      department: profile.department || '',
      designation: profile.designation || '',
      organization: profile.organization || '',
      researchGroup: profile.researchGroup || '',
      languages: profile.languages || [],
      availability: profile.availability || '',
      openToCollaborate: !!profile.openToCollaborate,
      openToMentor: !!profile.openToMentor,
      openToResearch: !!profile.openToResearch,
      emailVisibility: profile.emailVisibility || 'private',
      education: education || [],
      experience: experience || [],
      skills: skills || [],
      patents: patents || [],
      books: books || [],
      datasets: datasets || [],
      awards: awards || [],
      certificates: certificates || [],
      researchAreas: researchAreas || [],
      keywords: keywords || [],
      publications: publications || [],
      coAuthors: coAuthors || [],
      citationGraph: citationGraph || [],
      derivedAnalytics: derivedAnalytics || null,
      socialLinks,
      metrics,
      profileCompletion,
      followersCount: profile.followersCount || 0,
      followingCount: profile.followingCount || 0,
      connectionsCount: profile.connectionsCount || 0,
      pendingSentCount: profile.pendingSentCount || 0,
      pendingReceivedCount: profile.pendingReceivedCount || 0,
      createdAt: profile.createdAt,
      updatedAt: profile.updatedAt
    };

    await ProfileCache.set(userId.toString(), result);
    return result;
  }

  async getProfile(userId) {
    return await this.getFullProfile(userId, false);
  }

  async getProfileBySlug(profileSlug) {
    const user = await User.findOne({ profileSlug, isDeleted: { $ne: true } }).lean();
    if (!user) {
      throw new NotFoundError(`Profile not found for slug: ${profileSlug}`);
    }
    this.logAnalytics(user._id, 'views').catch(err => 
      console.error('Background logAnalytics error:', err)
    );
    return await this.getFullProfile(user._id, true);
  }

  async calculateAndSaveProfileCompletion(userId) {
    const user = await User.findById(userId);
    const profile = await Profile.findOne({ userId });
    if (!user || !profile) return 0;

    const educationCount = await Education.countDocuments({ userId, isDeleted: { $ne: true } });
    const experienceCount = await Experience.countDocuments({ userId, isDeleted: { $ne: true } });
    const skillsCount = await Skill.countDocuments({ userId, isDeleted: { $ne: true } });
    const projectsCount = await Project.countDocuments({ userId, isDeleted: { $ne: true } });
    const publicationsCount = await Publication.countDocuments({ userId, isDeleted: { $ne: true } });
    const socialLink = await SocialLink.findOne({ userId, isDeleted: { $ne: true } });

    let score = 10;
    const breakdown = {
      profilePhoto: false, coverBanner: false, basicInfo: false, location: false,
      institution: false, researchIdentity: false, education: false, experience: false,
      skills: false, bio: false, publications: false, projects: false
    };

    if (profile.profileImage || user.profileImage) { score += 10; breakdown.profilePhoto = true; }
    if (profile.coverImage) { score += 5; breakdown.coverBanner = true; }
    if (user.firstName && user.lastName && profile.headline) { score += 10; breakdown.basicInfo = true; }
    if (profile.country || profile.state || profile.city) { score += 5; breakdown.location = true; }
    if (profile.institution && profile.department) { score += 15; breakdown.institution = true; }
    if (socialLink && (socialLink.googleScholar || socialLink.orcid)) { score += 15; breakdown.researchIdentity = true; }
    if (educationCount > 0) { score += 10; breakdown.education = true; }
    if (experienceCount > 0) { score += 10; breakdown.experience = true; }
    if (skillsCount > 0) { score += 5; breakdown.skills = true; }
    if (profile.bio) { score += 5; breakdown.bio = true; }
    if (publicationsCount > 0) { score += 5; breakdown.publications = true; }
    if (projectsCount > 0) { score += 5; breakdown.projects = true; }

    const percentage = Math.min(100, score);
    await ProfileCompletion.findOneAndUpdate(
      { userId },
      { userId, percentage, breakdown },
      { upsert: true, new: true }
    );

    profile.profileCompletion = percentage;
    await profile.save();
    return percentage;
  }

  async calculateAndSaveResearchMetrics(userId) {
    const [
      publicationsCount, projectsCount, patentsCount, booksCount, datasetsCount, awardsCount,
      scholarProfile, existingMetric, followersCount, followingCount, experiences,
      completionObj, analytics, projects
    ] = await Promise.all([
      Publication.countDocuments({ userId, isDeleted: { $ne: true } }),
      Project.countDocuments({ userId, isDeleted: { $ne: true } }),
      Patent.countDocuments({ userId, isDeleted: { $ne: true } }),
      Book.countDocuments({ userId, isDeleted: { $ne: true } }),
      Dataset.countDocuments({ userId, isDeleted: { $ne: true } }),
      Award.countDocuments({ userId, isDeleted: { $ne: true } }),
      GoogleScholarProfile.findOne({ userId }).lean(),
      ResearchMetric.findOne({ userId }).lean(),
      Follow ? Follow.countDocuments({ followingId: userId }) : 0,
      Follow ? Follow.countDocuments({ followerId: userId }) : 0,
      Experience.find({ userId, isDeleted: { $ne: true } }).lean(),
      ProfileCompletion.findOne({ userId }).lean(),
      ProfileAnalytics.find({ userId }).lean(),
      Project.find({ userId, isDeleted: { $ne: true } }).lean()
    ]);

    let citationsCount = 0; let hIndex = 0; let i10Index = 0;

    if (scholarProfile) {
      citationsCount = scholarProfile.totalCitations || 0;
      hIndex = scholarProfile.hIndex || 0;
      i10Index = scholarProfile.i10Index || 0;
    }

    if (existingMetric) {
      citationsCount = existingMetric.citationsCount || citationsCount;
      hIndex = existingMetric.hIndex || hIndex;
      i10Index = existingMetric.i10Index || i10Index;
    }

    let experienceYears = 0;
    experiences.forEach(exp => {
      if (exp.duration) {
        const match = exp.duration.match(/(\d{4})\s*-\s*(\d{4}|Present)/i);
        if (match) {
          const start = parseInt(match[1]);
          const end = match[2].toLowerCase() === 'present' ? new Date().getFullYear() : parseInt(match[2]);
          experienceYears += Math.max(0, end - start);
        }
      }
    });

    const profileCompletion = completionObj ? completionObj.percentage : 0;
    const viewsCount = analytics.reduce((sum, item) => sum + (item.views || 0), 0);
    const downloadsCount = analytics.reduce((sum, item) => sum + (item.downloads || 0), 0);

    const collaboratorSet = new Set();
    projects.forEach(p => {
      if (p.collaborators) {
        p.collaborators.forEach(collabId => {
          if (collabId.toString() !== userId.toString()) collaboratorSet.add(collabId.toString());
        });
      }
    });
    const collaborationsCount = collaboratorSet.size;

    let researchScore = (publicationsCount * 2) + (citationsCount * 0.1) + (hIndex * 5) + 
                        (i10Index * 2) + (projectsCount * 3) + (collaborationsCount * 4) + 
                        (awardsCount * 2) + (profileCompletion * 0.1);

    researchScore = Math.round(researchScore * 100) / 100;

    const updatedMetric = await ResearchMetric.findOneAndUpdate(
      { userId },
      { userId, publicationsCount, citationsCount, hIndex, i10Index, experienceYears, projectsCount, patentsCount, booksCount, datasetsCount, downloadsCount, viewsCount, followersCount, followingCount, researchScore },
      { upsert: true, new: true }
    );

    const profile = await Profile.findOne({ userId });
    if (profile) {
      profile.metrics = {
        totalCitations: citationsCount, hIndex, i10Index, researchExperience: experienceYears,
        patentsCount, booksCount, datasetsCount, downloadsCount, viewsCount, researchScore
      };
      await profile.save();
      const { ProfileCache } = require('../../../cache/cache.service');
      await ProfileCache.del(userId.toString());
    }

    return updatedMetric;
  }

  async logAnalytics(userId, type = 'views') {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    await ProfileAnalytics.findOneAndUpdate(
      { userId, date: today },
      { $inc: { [type]: 1 } },
      { upsert: true }
    );
    setImmediate(() => {
      this.calculateAndSaveResearchMetrics(userId).catch(err =>
        console.error('Background metrics calculation error:', err)
      );
    });
  }

  async getAnalytics(userId) {
    return await ProfileAnalytics.find({ userId }).sort({ date: 1 }).limit(30);
  }

  async updateProfile(userId, updateData) {
    const profile = await Profile.findOne({ userId, isDeleted: { $ne: true } });
    if (!profile) throw new NotFoundError('Profile not found.');

    const user = await User.findById(userId).select('+password');
    if (!user) throw new NotFoundError('User not found.');

    // 1. Update Core User Details
    if (updateData.firstName) user.firstName = updateData.firstName;
    if (updateData.lastName) user.lastName = updateData.lastName;
    if (updateData.phone !== undefined) user.phone = updateData.phone;
    if (updateData.profileImage !== undefined) user.profileImage = updateData.profileImage;

    // Handle SEO-friendly username update if provided
    if (updateData.username && updateData.username !== user.username) {
      let cleanUsername = updateData.username.toLowerCase().trim()
        .replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').replace(/^-+/, '').replace(/-+$/, '');

      if (!cleanUsername) throw new ValidationError('Username must contain alphanumeric characters.');
      if (user.publicProfileId && cleanUsername.endsWith(`-${user.publicProfileId}`)) {
        cleanUsername = cleanUsername.substring(0, cleanUsername.length - user.publicProfileId.length - 1);
      }

      const exists = await User.findOne({ username: cleanUsername, _id: { $ne: userId }, isDeleted: { $ne: true } });
      if (exists) throw new ValidationError(`Username '${cleanUsername}' is already taken.`);

      user.username = cleanUsername;
      if (!user.publicProfileId) {
        const { generateRandomId } = require('../helper/username.helper');
        user.publicProfileId = `rc_${generateRandomId()}`;
      }
      user.profileSlug = `${cleanUsername}-${user.publicProfileId}`;
      user.profileUrl = `/profile/${user.profileSlug}`;
      user.publicProfileUrl = `https://researchconnect.com${user.profileUrl}`;
    }

    await user.save();

    // 2. Update Core Profile Details
    const coreFields = [
      'bio', 'displayName', 'headline', 'coverImage', 'profileImage',
      'dateOfBirth', 'nationality', 'country', 'state', 'city', 'institution', 'department', 'designation',
      'organization', 'researchGroup', 'languages', 'availability', 'openToCollaborate', 'openToMentor', 'openToResearch', 'emailVisibility',
      'researchSummary', 'currentResearch', 'researchVision'
    ];

    if (!profile.dataSourceTracking) {
      profile.dataSourceTracking = new Map();
    }

    coreFields.forEach(field => {
      if (updateData[field] !== undefined) {
        if (profile[field] !== updateData[field]) {
          profile[field] = updateData[field];
          profile.dataSourceTracking.set(field, {
            value: updateData[field],
            source: 'user',
            lastModifiedAt: new Date(),
            userModified: true
          });
        }
      }
    });

    await profile.save();

    // 3. Update Normalized Array Collections
    if (updateData.education !== undefined) await this._syncCollection(Education, userId, updateData.education);
    if (updateData.experience !== undefined) await this._syncCollection(Experience, userId, updateData.experience);
    if (updateData.skills !== undefined) await this._syncCollection(Skill, userId, updateData.skills);
    if (updateData.projects !== undefined) await this._syncCollection(Project, userId, updateData.projects);
    if (updateData.patents !== undefined) await this._syncCollection(Patent, userId, updateData.patents);
    if (updateData.books !== undefined) await this._syncCollection(Book, userId, updateData.books);
    if (updateData.datasets !== undefined) await this._syncCollection(Dataset, userId, updateData.datasets);
    
    if (updateData.awards !== undefined || updateData.achievements !== undefined) {
      const awards = updateData.awards || updateData.achievements;
      await this._syncCollection(Award, userId, awards);
    }
    if (updateData.certificates !== undefined || updateData.certifications !== undefined) {
      const certs = updateData.certificates || updateData.certifications;
      await this._syncCollection(Certificate, userId, certs);
    }

    // 4. Update Normalized Social Link Collection
    if (updateData.socialLinks !== undefined) {
      await SocialLink.findOneAndUpdate({ userId }, { ...updateData.socialLinks, userId }, { upsert: true, new: true });
      profile.socialLinks = {
        ...((profile.socialLinks && typeof profile.socialLinks.toObject === 'function') ? profile.socialLinks.toObject() : profile.socialLinks || {}),
        ...updateData.socialLinks
      };
      await profile.save();
    }

    // 5. Update Metrics Override if supplied
    if (updateData.metrics !== undefined) {
      await ResearchMetric.findOneAndUpdate({ userId }, { ...updateData.metrics, userId }, { upsert: true, new: true });
    }

    // 6. Recalculate and Sync
    await this.calculateAndSaveProfileCompletion(userId);
    await this.calculateAndSaveResearchMetrics(userId);

    // Invalidate Cache
    const { ProfileCache: ProfileCacheInvalidate } = require('../../../cache/cache.service');
    await ProfileCacheInvalidate.del(userId.toString());

    await ActivityLog.create({
      userId, action: 'PROFILE_UPDATED', description: 'Manually updated profile details and synced timelines'
    });

    return await this.getFullProfile(userId, false);
  }

  async deleteProfile(userId, deletedBy = null) {
    const profile = await Profile.findOne({ userId });
    if (!profile) throw new NotFoundError('Profile not found.');

    const user = await User.findById(userId).select('+password');
    if (!user) throw new NotFoundError('User not found.');

    await profileRepository.softDelete(profile._id, deletedBy || userId);
    user.isDeleted = true;
    user.deletedAt = new Date();
    user.deletedBy = deletedBy || userId;
    user.status = 'suspended';
    user.isActive = false;
    await user.save();

    const { ProfileCache: ProfileCacheInvalidate } = require('../../../cache/cache.service');
    await ProfileCacheInvalidate.del(userId.toString());

    return { success: true };
  }
}

module.exports = new ProfileService();