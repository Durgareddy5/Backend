const followRepository = require('../repository/follow.repository');
const Follow = require('../model/Follow');
const User = require('../../../models/User');
const Profile = require('../../../models/Profile');
const CoAuthor = require('../../../models/CoAuthor');
const { ProfileCache } = require('../../../cache/cache.service');
const { NotFoundError, ValidationError, ConflictError } = require('../../../common/errors/AppError');
const logger = require('../../../common/logger/winston');
const mongoose = require('mongoose');

class FollowService {
  /**
   * Follow a researcher
   */
  async follow(followerId, targetUserId) {
    if (followerId.toString() === targetUserId.toString()) {
      throw new ValidationError('You cannot follow yourself.');
    }

    // Verify target researcher exists
    const targetUser = await User.findOne({ _id: targetUserId, isDeleted: { $ne: true } });
    if (!targetUser) {
      throw new NotFoundError('Target researcher not found.');
    }

    // Check if already following
    const isFollowing = await followRepository.isFollowing(followerId, targetUserId);
    if (isFollowing) {
      throw new ConflictError('You are already following this researcher.');
    }

    // Create follow relationship
    const followDoc = await followRepository.create({
      followerId,
      followingId: targetUserId
    });

    // Atomically increment counts in Profile collections
    await Promise.all([
      Profile.findOneAndUpdate({ userId: followerId }, { $inc: { followingCount: 1 } }, { upsert: true, new: true }),
      Profile.findOneAndUpdate({ userId: targetUserId }, { $inc: { followersCount: 1 } }, { upsert: true, new: true })
    ]);

    // Invalidate profile cache
    await Promise.all([
      ProfileCache.del(followerId.toString()),
      ProfileCache.del(targetUserId.toString())
    ]);

    // Send Real-Time Notification
    const notificationService = require('../../notifications/service/notification.service');
    const followerName = targetUser.firstName ? `${targetUser.firstName} ${targetUser.lastName}` : 'Someone'; // Wait! targetUser is the one being followed, we need followerUser details!
    
    // Let's query the follower details first
    const followerUser = await User.findById(followerId).select('firstName lastName username').lean();
    if (followerUser) {
      const fName = `${followerUser.firstName} ${followerUser.lastName}`;
      await notificationService.createNotification({
        recipientId: targetUserId,
        actorId: followerId,
        type: 'follow',
        title: 'New Follower',
        message: `${fName} started following you.`,
        targetType: 'User',
        targetId: followerId,
        targetUrl: `/profile/${followerUser.username}`
      }).catch(err => logger.error(`Failed to create follow notification: ${err.message}`));
    }

    return followDoc;
  }

  /**
   * Unfollow a researcher
   */
  async unfollow(followerId, targetUserId) {
    // Check if follow exists
    const followDoc = await Follow.findOne({ followerId, followingId: targetUserId });
    if (!followDoc) {
      throw new NotFoundError('You are not following this researcher.');
    }

    // Remove relationship
    await Follow.deleteOne({ _id: followDoc._id });

    // Atomically decrement counts
    await Promise.all([
      Profile.findOneAndUpdate(
        { userId: followerId, followingCount: { $gt: 0 } }, 
        { $inc: { followingCount: -1 } }, 
        { new: true }
      ),
      Profile.findOneAndUpdate(
        { userId: targetUserId, followersCount: { $gt: 0 } }, 
        { $inc: { followersCount: -1 } }, 
        { new: true }
      )
    ]);

    // Invalidate profile cache
    await Promise.all([
      ProfileCache.del(followerId.toString()),
      ProfileCache.del(targetUserId.toString())
    ]);

    return { success: true };
  }

  /**
   * Resolve a user by username OR profileSlug (handles both profile URL types)
   */
  async _resolveUser(usernameOrSlug) {
    const user = await User.findOne({
      $or: [
        { username: usernameOrSlug },
        { profileSlug: usernameOrSlug }
      ],
      isDeleted: { $ne: true }
    }).lean();
    if (!user) throw new NotFoundError('Researcher not found.');
    return user;
  }

  /**
   * Get followers of a researcher by username or profileSlug
   */
  async getFollowers(usernameOrSlug, queryOptions) {
    const user = await this._resolveUser(usernameOrSlug);
    return await followRepository.findFollowers(user._id, queryOptions);
  }

  /**
   * Get following list of a researcher by username or profileSlug
   */
  async getFollowing(usernameOrSlug, queryOptions) {
    const user = await this._resolveUser(usernameOrSlug);
    return await followRepository.findFollowing(user._id, queryOptions);
  }

  /**
   * Get mutual followers list between current user and target user
   */
  async getMutualFollowers(currentUserId, targetUsernameOrSlug, queryOptions) {
    const targetUser = await this._resolveUser(targetUsernameOrSlug);
    return await followRepository.getMutualFollowers(currentUserId, targetUser._id, queryOptions);
  }

  /**
   * Check follow status and return mutual followers metadata
   */
  async getFollowStatus(currentUserId, targetUserId) {
    const targetUser = await User.findOne({ _id: targetUserId, isDeleted: { $ne: true } }).lean();
    if (!targetUser) {
      throw new NotFoundError('Target researcher not found.');
    }

    const [isFollowing, mutualCount, mutualList, targetProfile, myProfile] = await Promise.all([
      followRepository.isFollowing(currentUserId, targetUserId),
      followRepository.countMutualFollowers(currentUserId, targetUserId),
      followRepository.getMutualFollowers(currentUserId, targetUserId, { limit: 3 }),
      Profile.findOne({ userId: targetUserId }).lean(),
      Profile.findOne({ userId: currentUserId }).lean()
    ]);

    return {
      isFollowing,
      followersCount: targetProfile?.followersCount || 0,
      followingCount: targetProfile?.followingCount || 0,
      mutualCount,
      mutualPreview: mutualList.docs.map(doc => ({
        userId: doc.user._id,
        fullName: doc.user.fullName,
        profileImage: doc.user.profileImage
      }))
    };
  }

  /**
   * Follow suggestions algorithm (dynamic ranking)
   */
  async getSuggestions(userId, { limit = 10, page = 1 } = {}) {
    const Connection = require('../../../models/Connection');
    const Publication = require('../../../models/Publication');

    const myProfile = await Profile.findOne({ userId }).lean();
    const myCoAuthors = await CoAuthor.find({ userId }).lean();
    const myFollows = await Follow.find({ followerId: userId }).lean();
    
    const myConnections = await Connection.find({
      $or: [{ researcherA: userId }, { researcherB: userId }]
    }).lean();
    const myConnectionIds = myConnections.map(c => 
      c.researcherA.toString() === userId.toString() ? c.researcherB.toString() : c.researcherA.toString()
    );

    const followingIds = myFollows.map(f => f.followingId.toString());
    const excludedIds = [userId.toString(), ...followingIds, ...myConnectionIds];

    // Fetch candidate users
    const candidates = await User.find({
      _id: { $nin: excludedIds },
      isDeleted: { $ne: true },
      status: 'active'
    }).lean();

    const candidateIds = candidates.map(c => c._id);
    
    // Bulk load Candidate Profiles
    const candidateProfiles = await Profile.find({
      userId: { $in: candidateIds }
    }).lean();

    // Map profiles to userId for easy lookup
    const profileMap = new Map();
    candidateProfiles.forEach(p => profileMap.set(p.userId.toString(), p));

    // Bulk load candidate publications for topic and keyword matching
    const candidatePublications = await Publication.find({
      userId: { $in: candidateIds },
      isDeleted: { $ne: true },
      status: 'published'
    }).select('userId keywords title abstract').lean();

    const publicationsMap = new Map();
    candidatePublications.forEach(pub => {
      const uid = pub.userId.toString();
      if (!publicationsMap.has(uid)) {
        publicationsMap.set(uid, []);
      }
      publicationsMap.get(uid).push(pub);
    });

    // Bulk load Candidate Co-Authors
    const candidatesCoAuthors = await CoAuthor.find({ userId: { $in: candidateIds } }).lean();
    const candCoAuthorsMap = new Map();
    candidatesCoAuthors.forEach(co => {
      const uid = co.userId.toString();
      if (!candCoAuthorsMap.has(uid)) candCoAuthorsMap.set(uid, []);
      candCoAuthorsMap.get(uid).push(co.name.toLowerCase());
    });

    // Bulk load Mutual Connections (Connections where one side is in my connections, other is a candidate)
    const mutualConnectionsData = await Connection.find({
      $or: [
        { researcherA: { $in: myConnectionIds }, researcherB: { $in: candidateIds } },
        { researcherB: { $in: myConnectionIds }, researcherA: { $in: candidateIds } }
      ]
    }).lean();

    const candidateMutualsMap = new Map();
    mutualConnectionsData.forEach(c => {
      const a = c.researcherA.toString();
      const b = c.researcherB.toString();
      if (myConnectionIds.includes(a) && candidateIds.some(id => id.toString() === b)) {
        if (!candidateMutualsMap.has(b)) candidateMutualsMap.set(b, new Set());
        candidateMutualsMap.get(b).add(a);
      }
      if (myConnectionIds.includes(b) && candidateIds.some(id => id.toString() === a)) {
        if (!candidateMutualsMap.has(a)) candidateMutualsMap.set(a, new Set());
        candidateMutualsMap.get(a).add(b);
      }
    });

    // Calculate scoring for each candidate
    const suggestions = [];
    const myCoNames = myCoAuthors.map(c => c.name.toLowerCase());
    const myAreas = (myProfile?.researchAreas || []).map(a => a.name?.toLowerCase().trim()).filter(Boolean);
    const mySkills = (myProfile?.skills || []).map(s => s.name?.toLowerCase().trim()).filter(Boolean);
    const myName = `${myProfile?.firstName || ''} ${myProfile?.lastName || ''}`.toLowerCase().trim();

    for (const cand of candidates) {
      const candIdStr = cand._id.toString();
      const candProfile = profileMap.get(candIdStr) || {};

      let score = 0;
      const reasons = [];

      // 1. Common Research Areas (30% weight)
      const candAreas = (candProfile.researchAreas || []).map(a => a.name?.toLowerCase().trim()).filter(Boolean);
      const sharedAreas = myAreas.filter(a => candAreas.includes(a));
      if (sharedAreas.length > 0) {
        const areaWeight = Math.min(1.0, sharedAreas.length / 2);
        score += 30 * areaWeight;
        reasons.push(`Shared research area: ${sharedAreas[0]}`);
      }

      // 2. Publication Keywords (20% weight)
      const candPubs = publicationsMap.get(candIdStr) || [];
      const candPubKeywords = [];
      candPubs.forEach(p => (p.keywords || []).forEach(k => candPubKeywords.push(k.toLowerCase().trim())));
      const sharedKeywords = mySkills.filter(k => candPubKeywords.includes(k));
      if (sharedKeywords.length > 0) {
        const keywordWeight = Math.min(1.0, sharedKeywords.length / 3);
        score += 20 * keywordWeight;
        reasons.push(`${sharedKeywords.length} matching publication keywords`);
      }

      // 3. Publication Topics (15% weight)
      let topicMatches = 0;
      candPubs.forEach(p => {
        const text = `${p.title || ''} ${p.abstract || ''}`.toLowerCase();
        const hasMatch = mySkills.some(k => text.includes(k)) || myAreas.some(a => text.includes(a));
        if (hasMatch) topicMatches++;
      });
      if (topicMatches > 0) {
        score += 15 * Math.min(1.0, topicMatches / 2);
        reasons.push('Overlap in publication topics');
      }

      // 4. Institution Match (10% weight)
      if (myProfile?.institution && candProfile?.institution && 
          myProfile.institution.toLowerCase().trim() === candProfile.institution.toLowerCase().trim()) {
        score += 10;
        reasons.push(`Same institution: ${candProfile.institution}`);
      }

      // 5. Mutual Connections (10% weight)
      const candMutualSet = candidateMutualsMap.get(candIdStr) || new Set();
      const mutualConnCount = candMutualSet.size;
      if (mutualConnCount > 0) {
        score += 10 * Math.min(1.0, mutualConnCount / 3);
        reasons.push(`${mutualConnCount} mutual connection${mutualConnCount > 1 ? 's' : ''}`);
      }

      // 6. Common Co-Authors / Collaboration History (5% weight)
      const candCoAuthNames = candCoAuthorsMap.get(candIdStr) || [];
      const sharedCoAuthors = myCoNames.filter(name => candCoAuthNames.includes(name));
      const candName = `${cand.firstName || ''} ${cand.lastName || ''}`.toLowerCase().trim();
      const isCoAuthor = myCoNames.includes(candName) || candCoAuthNames.includes(myName);
      if (isCoAuthor || sharedCoAuthors.length > 0) {
        score += 5;
        reasons.push('Collaboration history');
      }

      // 7. Country Match (5% weight)
      if (myProfile?.country && candProfile?.country && 
          myProfile.country.toLowerCase().trim() === candProfile.country.toLowerCase().trim()) {
        score += 5;
        reasons.push(`Same country: ${candProfile.country}`);
      }

      // 8. Recent Activity (5% weight)
      const candUpdatedAt = candProfile.updatedAt || cand.updatedAt;
      const isRecent = candUpdatedAt && (Date.now() - new Date(candUpdatedAt).getTime() < 7 * 24 * 60 * 60 * 1000);
      score += 5 * (isRecent ? 1.0 : 0.5);

      // Final score fallback
      if (score === 0) {
        score = 15; // default fallback match percentage
      }

      // Make sure matchPercentage is valid
      const matchPercentage = Math.min(100, Math.max(10, Math.round(score)));

      suggestions.push({
        user: {
          _id: cand._id,
          firstName: cand.firstName,
          lastName: cand.lastName,
          fullName: cand.fullName,
          username: cand.username,
          profileImage: cand.profileImage || candProfile.profileImage
        },
        profile: {
          headline: candProfile.headline || '',
          institution: candProfile.institution || '',
          country: candProfile.country || cand.country || '',
          researchAreas: candProfile.researchAreas || [],
          publicationsCount: candPubs.length,
          followersCount: candProfile.followersCount || 0
        },
        matchPercentage,
        reasons,
        reason: reasons.slice(0, 2).join(', ') || 'Similar profile'
      });
    }

    // Sort by score descending
    suggestions.sort((a, b) => b.matchPercentage - a.matchPercentage);

    // Pagination
    const startIndex = (page - 1) * limit;
    const paginatedSuggestions = suggestions.slice(startIndex, startIndex + limit);

    // Retrieve mutual followers list preview for sliced paginated suggestions only
    for (const item of paginatedSuggestions) {
      const mutualFollowersPreview = await followRepository.getMutualFollowers(userId, item.user._id, { limit: 3 });
      item.mutualFollowers = mutualFollowersPreview.docs.map(doc => ({
        _id: doc.user._id,
        fullName: doc.user.fullName,
        profileImage: doc.user.profileImage
      }));
    }

    return {
      docs: paginatedSuggestions,
      total: suggestions.length,
      page: Number(page),
      limit: Number(limit),
      totalPages: Math.ceil(suggestions.length / limit)
    };
  }
}

module.exports = new FollowService();
