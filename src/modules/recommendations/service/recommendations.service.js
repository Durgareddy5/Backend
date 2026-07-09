const recommendationsRepository = require('../repository/recommendations.repository');
const config = require('../../../config/recommendation.config');
const Profile = require('../../../models/Profile');
const User = require('../../../models/User');
const Publication = require('../../../models/Publication');
const Follow = require('../../../models/Follow');
const Connection = require('../../../models/Connection');

const Project = require('../../../models/Project');
const Event = require('../../../models/Event');
const logger = require('../../../common/logger/winston');

class RecommendationsService {
  /**
   * Refreshes the cached recommendation profile of a user.
   */
  async refreshUserRecommendationProfile(userId) {
    const [profile, followingDocs, connections, userPublications] = await Promise.all([
      Profile.findOne({ userId }).lean(),
      Follow.find({ followerId: userId }).select('followingId').lean(),
      Connection.find({
        $or: [{ senderId: userId }, { receiverId: userId }],
        status: 'accepted'
      }).lean(),
      Publication.find({ userId, isDeleted: { $ne: true } }).select('keywords researchAreas authors').lean()
    ]);

    const followingIds = followingDocs.map(f => f.followingId.toString());
    const connectionIds = connections.map(c =>
      c.senderId.toString() === userId.toString() ? c.receiverId.toString() : c.senderId.toString()
    );

    const researchAreas = profile?.researchAreas || [];
    const keywords = profile?.skills?.map(s => s.name) || [];
    const institutions = profile?.institution ? [profile.institution] : [];
    const countries = profile?.country ? [profile.country] : [];

    // Aggregate co-authors from publications
    const coAuthorSet = new Set();
    userPublications.forEach(pub => {
      if (pub.authors) {
        pub.authors.split(',').forEach(auth => {
          const trimmed = auth.trim();
          if (trimmed) coAuthorSet.add(trimmed);
        });
      }
    });

    const recommendationProfile = {
      researchAreas,
      keywords,
      institutions,
      coAuthors: Array.from(coAuthorSet),
      communities: [], // Can be updated based on joined communities if needed
      projects: [],
      datasets: [],
      countries,
      languages: [],
      activityCount: userPublications.length * 5 + followingIds.length + connectionIds.length
    };

    await recommendationsRepository.saveProfile(userId, recommendationProfile);
    return recommendationProfile;
  }

  /**
   * Calculates the compatibility score (0-100%) between two users.
   */
  async calculateCompatibilityScore(userId, targetUserId) {
    const Connection = require('../../../models/Connection');
    const Publication = require('../../../models/Publication');
    const CoAuthor = require('../../../models/CoAuthor');

    // Fetch profiles for both users
    const [userProfile, targetProfile] = await Promise.all([
      Profile.findOne({ userId }).lean(),
      Profile.findOne({ userId: targetUserId }).lean()
    ]);

    if (!userProfile || !targetProfile) {
      return { score: 0, reasons: ['Missing profile data'] };
    }

    const [userConnections, targetPublications, targetCoAuthors, userCoAuthors] = await Promise.all([
      Connection.find({
        $or: [{ researcherA: userId }, { researcherB: userId }]
      }).lean(),
      Publication.find({ userId: targetUserId, isDeleted: { $ne: true }, status: 'published' }).select('keywords title abstract').lean(),
      CoAuthor.find({ userId: targetUserId }).lean(),
      CoAuthor.find({ userId }).lean()
    ]);

    const myConnectionIds = userConnections.map(c => 
      c.researcherA.toString() === userId.toString() ? c.researcherB.toString() : c.researcherA.toString()
    );

    let score = 0;
    const reasons = [];

    const myAreas = (userProfile.researchAreas || []).map(a => a.name?.toLowerCase().trim()).filter(Boolean);
    const targetAreas = (targetProfile.researchAreas || []).map(a => a.name?.toLowerCase().trim()).filter(Boolean);
    const mySkills = (userProfile.skills || []).map(s => s.name?.toLowerCase().trim()).filter(Boolean);
    const myName = `${userProfile.firstName || ''} ${userProfile.lastName || ''}`.toLowerCase().trim();

    // 1. Common Research Areas (30%)
    const sharedAreas = myAreas.filter(a => targetAreas.includes(a));
    if (sharedAreas.length > 0) {
      const areaWeight = Math.min(1.0, sharedAreas.length / 2);
      score += 30 * areaWeight;
      reasons.push(`Shared research area: ${sharedAreas[0]}`);
    }

    // 2. Publication Keywords (20%)
    const targetPubKeywords = [];
    targetPublications.forEach(p => (p.keywords || []).forEach(k => targetPubKeywords.push(k.toLowerCase().trim())));
    const sharedKeywords = mySkills.filter(k => targetPubKeywords.includes(k));
    if (sharedKeywords.length > 0) {
      const keywordWeight = Math.min(1.0, sharedKeywords.length / 3);
      score += 20 * keywordWeight;
      reasons.push(`${sharedKeywords.length} matching publication keywords`);
    }

    // 3. Publication Topics (15%)
    let topicMatches = 0;
    targetPublications.forEach(p => {
      const text = `${p.title || ''} ${p.abstract || ''}`.toLowerCase();
      const hasMatch = mySkills.some(k => text.includes(k)) || myAreas.some(a => text.includes(a));
      if (hasMatch) topicMatches++;
    });
    if (topicMatches > 0) {
      score += 15 * Math.min(1.0, topicMatches / 2);
      reasons.push('Overlap in publication topics');
    }

    // 4. Institution Match (10%)
    if (userProfile.institution && targetProfile.institution && 
        userProfile.institution.toLowerCase().trim() === targetProfile.institution.toLowerCase().trim()) {
      score += 10;
      reasons.push(`Same institution: ${targetProfile.institution}`);
    }

    // 5. Mutual Connections (10%)
    const targetConnections = await Connection.find({
      $or: [{ researcherA: targetUserId }, { researcherB: targetUserId }]
    }).lean();
    const targetConnectionIds = targetConnections.map(c =>
      c.researcherA.toString() === targetUserId.toString() ? c.researcherB.toString() : c.researcherA.toString()
    );
    const mutualConnections = myConnectionIds.filter(id => targetConnectionIds.includes(id));
    if (mutualConnections.length > 0) {
      const mutualConnCount = mutualConnections.length;
      score += 10 * Math.min(1.0, mutualConnCount / 3);
      reasons.push(`${mutualConnCount} mutual connection${mutualConnCount > 1 ? 's' : ''}`);
    }

    // 6. Common Co-Authors / Collaboration History (5%)
    const myCoNames = userCoAuthors.map(c => c.name.toLowerCase());
    const targetCoAuthNames = targetCoAuthors.map(co => co.name.toLowerCase());
    const sharedCoAuthors = myCoNames.filter(name => targetCoAuthNames.includes(name));
    const targetName = `${targetProfile.firstName || ''} ${targetProfile.lastName || ''}`.toLowerCase().trim();
    const isCoAuthor = myCoNames.includes(targetName) || targetCoAuthNames.includes(myName);
    if (isCoAuthor || sharedCoAuthors.length > 0) {
      score += 5;
      reasons.push('Collaboration history');
    }

    // 7. Country Match (5%)
    if (userProfile.country && targetProfile.country && 
        userProfile.country.toLowerCase().trim() === targetProfile.country.toLowerCase().trim()) {
      score += 5;
      reasons.push(`Same country: ${targetProfile.country}`);
    }

    // 8. Recent Activity (5%)
    const targetUpdatedAt = targetProfile.updatedAt;
    const isRecent = targetUpdatedAt && (Date.now() - new Date(targetUpdatedAt).getTime() < 7 * 24 * 60 * 60 * 1000);
    score += 5 * (isRecent ? 1.0 : 0.5);

    if (score === 0) score = 15;

    return {
      score: Math.min(100, Math.max(10, Math.round(score))),
      reasons
    };
  }

  /**
   * Refreshes recommendation scores for a single user in the background.
   */
  async refreshAllRecommendations(userId) {
    try {
      logger.info(`Starting background recommendations refresh for user: ${userId}`);
      
      // Refresh user profile cache first
      await this.refreshUserRecommendationProfile(userId);

      // 1. Refresh Researcher Matches
      const otherUsers = await User.find({ 
        _id: { $ne: userId }, 
        status: 'active', 
        isDeleted: { $ne: true } 
      }).select('_id').lean();

      for (const targetUser of otherUsers) {
        const { score, reasons } = await this.calculateCompatibilityScore(userId, targetUser._id);
        if (score >= 10) { // Only store meaningful matches
          await recommendationsRepository.saveRecommendationScore(
            userId, 
            targetUser._id, 
            'User', 
            score, 
            reasons
          );
        }
      }

      // 2. Refresh Publication Matches
      // Simple publication matcher based on keywords
      const userProfile = await Profile.findOne({ userId }).lean();
      const userKeywords = (userProfile?.skills || []).map(s => s.name.toLowerCase().trim());
      const publications = await Publication.find({ 
        userId: { $ne: userId }, 
        isDeleted: { $ne: true } 
      }).select('_id keywords title').lean();

      for (const pub of publications) {
        const pubKeywords = (pub.keywords || []).map(k => k.toLowerCase().trim());
        const shared = userKeywords.filter(k => pubKeywords.includes(k));
        let pubScore = 0;
        const reasons = [];

        if (shared.length > 0) {
          pubScore = Math.min(100, Math.round((shared.length / Math.max(5, userKeywords.length)) * 100));
          reasons.push('Same Keywords');
        }

        if (pubScore >= 10) {
          await recommendationsRepository.saveRecommendationScore(
            userId, 
            pub._id, 
            'Publication', 
            pubScore, 
            reasons
          );
        }
      }



      logger.info(`Completed recommendations refresh for user: ${userId}`);
    } catch (err) {
      logger.error(`Error refreshing recommendations for user ${userId}:`, err);
    }
  }

  /**
   * Retrieves recommended researchers for a user.
   */
  async getRecommendedResearchers(userId, queryOptions = {}) {
    const dismissedIds = await recommendationsRepository.getInteractedTargetIds(userId, 'User', ['dismiss']);
    const followingDocs = await Follow.find({ followerId: userId }).select('followingId').lean();
    const followingIds = followingDocs.map(f => f.followingId.toString());

    // Retrieve scores
    const result = await recommendationsRepository.getRecommendationScores(userId, 'User', queryOptions);
    
    // Filter out followed and dismissed researchers, then populate
    const filteredDocs = [];
    for (const scoreDoc of result.docs) {
      const targetIdStr = scoreDoc.targetId.toString();
      if (followingIds.includes(targetIdStr) || dismissedIds.includes(targetIdStr)) {
        continue;
      }

      const user = await User.findById(scoreDoc.targetId).select('firstName lastName fullName profileImage').lean();
      const profile = await Profile.findOne({ userId: scoreDoc.targetId }).select('institution department designation skills').lean();

      if (user) {
        filteredDocs.push({
          userId: user._id,
          name: user.fullName || `${user.firstName} ${user.lastName}`,
          avatar: user.profileImage || (profile ? profile.profileImage : ''),
          institution: profile?.institution || '',
          department: profile?.department || '',
          designation: profile?.designation || '',
          matchPercentage: scoreDoc.score,
          reasons: scoreDoc.reasons,
          skills: profile?.skills || []
        });
      }
    }

    return {
      docs: filteredDocs,
      nextCursor: result.nextCursor
    };
  }

  /**
   * Retrieves recommended publications.
   */
  async getRecommendedPublications(userId, queryOptions = {}) {
    const dismissedIds = await recommendationsRepository.getInteractedTargetIds(userId, 'Publication', ['dismiss']);
    const result = await recommendationsRepository.getRecommendationScores(userId, 'Publication', queryOptions);

    const filteredDocs = [];
    for (const scoreDoc of result.docs) {
      if (dismissedIds.includes(scoreDoc.targetId.toString())) continue;

      const pub = await Publication.findById(scoreDoc.targetId)
        .populate('userId', 'firstName lastName fullName profileImage institution')
        .lean();

      if (pub) {
        filteredDocs.push({
          ...pub,
          matchPercentage: scoreDoc.score,
          reasons: scoreDoc.reasons
        });
      }
    }

    return {
      docs: filteredDocs,
      nextCursor: result.nextCursor
    };
  }



  /**
   * Retrieves recommended projects.
   */
  async getRecommendedProjects(userId, queryOptions = {}) {
    // Fallback: Query projects matching user's keywords or areas
    const profile = await Profile.findOne({ userId }).lean();
    const keywords = (profile?.skills || []).map(s => s.name.toLowerCase());

    const projects = await Project.find({
      userId: { $ne: userId },
      isDeleted: { $ne: true }
    })
      .populate('userId', 'firstName lastName fullName profileImage')
      .limit(10)
      .lean();

    const scored = projects.map(p => {
      const pKeywords = (p.keywords || []).map(k => k.toLowerCase());
      const shared = keywords.filter(k => pKeywords.includes(k));
      const score = shared.length > 0 ? Math.min(100, Math.round((shared.length / Math.max(3, keywords.length)) * 100)) : 15;
      return {
        ...p,
        matchPercentage: score,
        reasons: shared.length > 0 ? ['Shared Keywords'] : ['Suggested Collaboration']
      };
    }).sort((a, b) => b.matchPercentage - a.matchPercentage);

    return {
      docs: scored,
      nextCursor: null
    };
  }

  /**
   * Retrieves recommended funding opportunities.
   */
  async getRecommendedFunding(userId, queryOptions = {}) {
    // Fetch upcoming events of type 'Funding'
    const fundingEvents = await Event.find({
      type: 'Funding',
      date: { $gte: new Date() },
      isDeleted: { $ne: true }
    })
      .sort({ date: 1 })
      .limit(10)
      .lean();

    return {
      docs: fundingEvents,
      nextCursor: null
    };
  }

  /**
   * Retrieves recommended conferences.
   */
  async getRecommendedConferences(userId, queryOptions = {}) {
    // Fetch upcoming events of type 'Conference'
    const conferences = await Event.find({
      type: 'Conference',
      date: { $gte: new Date() },
      isDeleted: { $ne: true }
    })
      .sort({ date: 1 })
      .limit(10)
      .lean();

    return {
      docs: conferences,
      nextCursor: null
    };
  }
}

module.exports = new RecommendationsService();
