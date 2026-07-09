const BaseRepository = require('../../../common/repository/base.repository');
const Follow = require('../model/Follow');
const { cursorPaginateAggregate } = require('../utils/cursorPagination');
const mongoose = require('mongoose');

class FollowRepository extends BaseRepository {
  constructor() {
    super(Follow);
  }

  /**
   * Check if a follow relationship exists
   */
  async isFollowing(followerId, followingId) {
    const exists = await this.model.findOne({
      followerId,
      followingId
    }).lean();
    return !!exists;
  }

  /**
   * Find followers of a user with cursor pagination and search filter
   */
  async findFollowers(userId, { limit = 10, cursor, search = '' }) {
    const castUserId = new mongoose.Types.ObjectId(userId);
    const pipeline = [
      { $match: { followingId: castUserId } },
      {
        $lookup: {
          from: 'users',
          localField: 'followerId',
          foreignField: '_id',
          as: 'user'
        }
      },
      { $unwind: '$user' },
      {
        $lookup: {
          from: 'profiles',
          localField: 'followerId',
          foreignField: 'userId',
          as: 'profile'
        }
      },
      { $unwind: { path: '$profile', preserveNullAndEmptyArrays: true } }
    ];

    if (search) {
      pipeline.push({
        $match: {
          $or: [
            { 'user.fullName': { $regex: search, $options: 'i' } },
            { 'user.firstName': { $regex: search, $options: 'i' } },
            { 'user.lastName': { $regex: search, $options: 'i' } },
            { 'profile.headline': { $regex: search, $options: 'i' } },
            { 'profile.institution': { $regex: search, $options: 'i' } }
          ]
        }
      });
    }

    pipeline.push({
      $project: {
        _id: 1,
        followerId: 1,
        followingId: 1,
        createdAt: 1,
        user: {
          _id: 1,
          firstName: 1,
          lastName: 1,
          fullName: 1,
          username: 1,
          profileSlug: 1,
          profileImage: 1
        },
        profile: {
          headline: 1,
          institution: 1,
          country: 1,
          researchAreas: 1
        }
      }
    });

    return await cursorPaginateAggregate(this.model, pipeline, { limit, cursor });
  }

  /**
   * Find followed researchers of a user with cursor pagination and search filter
   */
  async findFollowing(userId, { limit = 10, cursor, search = '' }) {
    const castUserId = new mongoose.Types.ObjectId(userId);
    const pipeline = [
      { $match: { followerId: castUserId } },
      {
        $lookup: {
          from: 'users',
          localField: 'followingId',
          foreignField: '_id',
          as: 'user'
        }
      },
      { $unwind: '$user' },
      {
        $lookup: {
          from: 'profiles',
          localField: 'followingId',
          foreignField: 'userId',
          as: 'profile'
        }
      },
      { $unwind: { path: '$profile', preserveNullAndEmptyArrays: true } }
    ];

    if (search) {
      pipeline.push({
        $match: {
          $or: [
            { 'user.fullName': { $regex: search, $options: 'i' } },
            { 'user.firstName': { $regex: search, $options: 'i' } },
            { 'user.lastName': { $regex: search, $options: 'i' } },
            { 'profile.headline': { $regex: search, $options: 'i' } },
            { 'profile.institution': { $regex: search, $options: 'i' } }
          ]
        }
      });
    }

    pipeline.push({
      $project: {
        _id: 1,
        followerId: 1,
        followingId: 1,
        createdAt: 1,
        user: {
          _id: 1,
          firstName: 1,
          lastName: 1,
          fullName: 1,
          username: 1,
          profileSlug: 1,
          profileImage: 1
        },
        profile: {
          headline: 1,
          institution: 1,
          country: 1,
          researchAreas: 1
        }
      }
    });

    return await cursorPaginateAggregate(this.model, pipeline, { limit, cursor });
  }

  /**
   * Retrieve mutual followers list
   */
  async getMutualFollowers(userIdA, userIdB, { limit = 10, cursor } = {}) {
    const castUserIdA = new mongoose.Types.ObjectId(userIdA);
    const castUserIdB = new mongoose.Types.ObjectId(userIdB);

    // Mutual followers are users who:
    // 1. Follow User B (followerId = C, followingId = B)
    // 2. Are followed by User A (followerId = A, followingId = C)
    
    // We can do this with an aggregation pipeline starting from follows where followingId = B.
    const pipeline = [
      { $match: { 
        followingId: castUserIdB,
        followerId: { $nin: [castUserIdA, castUserIdB] }
      } },
      // Check if followerId is followed by User A
      {
        $lookup: {
          from: 'follows',
          let: { followerId: '$followerId' },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ['$followerId', castUserIdA] },
                    { $eq: ['$followingId', '$$followerId'] }
                  ]
                }
              }
            }
          ],
          as: 'isFollowedByA'
        }
      },
      // Keep only matches
      { $match: { 'isFollowedByA.0': { $exists: true } } },
      // Join User & Profile details of the mutual follower (followerId)
      {
        $lookup: {
          from: 'users',
          localField: 'followerId',
          foreignField: '_id',
          as: 'user'
        }
      },
      { $unwind: '$user' },
      {
        $lookup: {
          from: 'profiles',
          localField: 'followerId',
          foreignField: 'userId',
          as: 'profile'
        }
      },
      { $unwind: { path: '$profile', preserveNullAndEmptyArrays: true } },
      {
        $project: {
          _id: 1,
          followerId: 1,
          createdAt: 1,
          user: {
            _id: 1,
            firstName: 1,
            lastName: 1,
            fullName: 1,
            username: 1,
            profileSlug: 1,
            profileImage: 1
          },
          profile: {
            headline: 1,
            institution: 1,
            country: 1
          }
        }
      }
    ];

    return await cursorPaginateAggregate(this.model, pipeline, { limit, cursor });
  }

  /**
   * Dynamic calculation of mutual followers count
   */
  async countMutualFollowers(userIdA, userIdB) {
    const castUserIdA = new mongoose.Types.ObjectId(userIdA);
    const castUserIdB = new mongoose.Types.ObjectId(userIdB);

    const result = await this.model.aggregate([
      { $match: { 
        followingId: castUserIdB,
        followerId: { $nin: [castUserIdA, castUserIdB] }
      } },
      {
        $lookup: {
          from: 'follows',
          let: { followerId: '$followerId' },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ['$followerId', castUserIdA] },
                    { $eq: ['$followingId', '$$followerId'] }
                  ]
                }
              }
            }
          ],
          as: 'isFollowedByA'
        }
      },
      { $match: { 'isFollowedByA.0': { $exists: true } } },
      { $count: 'count' }
    ]);

    return result[0]?.count || 0;
  }
}

module.exports = new FollowRepository();
