const BaseRepository = require('../../../common/repository/base.repository');
const Connection = require('../model/Connection');
const ConnectionRequest = require('../model/ConnectionRequest');
const { cursorPaginateAggregate } = require('../../follow/utils/cursorPagination');
const mongoose = require('mongoose');

class ConnectionsRepository extends BaseRepository {
  constructor() {
    super(Connection);
  }

  /**
   * Helper to sort user IDs to ensure researcherA < researcherB
   */
  _sortUserIds(userIdA, userIdB) {
    const idAStr = userIdA.toString();
    const idBStr = userIdB.toString();
    return idAStr < idBStr 
      ? [userIdA, userIdB] 
      : [userIdB, userIdA];
  }

  /**
   * Find a connection between two users
   */
  async findConnection(userIdA, userIdB) {
    const [researcherA, researcherB] = this._sortUserIds(userIdA, userIdB);
    return await this.model.findOne({ researcherA, researcherB }).lean();
  }

  /**
   * Find connections for a user with pagination and search
   */
  async findConnections(userId, { limit = 10, cursor, search = '' }) {
    const castUserId = new mongoose.Types.ObjectId(userId);
    const pipeline = [
      {
        $match: {
          $or: [
            { researcherA: castUserId },
            { researcherB: castUserId }
          ]
        }
      },
      {
        $project: {
          _id: 1,
          connectedAt: 1,
          createdAt: 1,
          otherUserId: {
            $cond: {
              if: { $eq: ['$researcherA', castUserId] },
              then: '$researcherB',
              else: '$researcherA'
            }
          }
        }
      },
      {
        $lookup: {
          from: 'users',
          localField: 'otherUserId',
          foreignField: '_id',
          as: 'user'
        }
      },
      { $unwind: '$user' },
      {
        $lookup: {
          from: 'profiles',
          localField: 'otherUserId',
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
        connectedAt: 1,
        otherUserId: 1,
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
   * Find any connection request between A and B
   */
  async findConnectionRequest(userIdA, userIdB) {
    return await ConnectionRequest.findOne({
      $or: [
        { senderId: userIdA, receiverId: userIdB },
        { senderId: userIdB, receiverId: userIdA }
      ]
    }).lean();
  }

  /**
   * Find received connection requests for a user
   */
  async findReceivedRequests(userId) {
    const castUserId = new mongoose.Types.ObjectId(userId);
    return await ConnectionRequest.aggregate([
      { $match: { receiverId: castUserId, status: 'pending' } },
      {
        $lookup: {
          from: 'users',
          localField: 'senderId',
          foreignField: '_id',
          as: 'user'
        }
      },
      { $unwind: '$user' },
      {
        $lookup: {
          from: 'profiles',
          localField: 'senderId',
          foreignField: 'userId',
          as: 'profile'
        }
      },
      { $unwind: { path: '$profile', preserveNullAndEmptyArrays: true } },
      // Lookup mutual connections count
      {
        $project: {
          _id: 1,
          senderId: 1,
          receiverId: 1,
          note: 1,
          status: 1,
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
      },
      { $sort: { createdAt: -1 } }
    ]);
  }

  /**
   * Find sent connection requests from a user
   */
  async findSentRequests(userId) {
    const castUserId = new mongoose.Types.ObjectId(userId);
    return await ConnectionRequest.aggregate([
      { $match: { senderId: castUserId, status: 'pending' } },
      {
        $lookup: {
          from: 'users',
          localField: 'receiverId',
          foreignField: '_id',
          as: 'user'
        }
      },
      { $unwind: '$user' },
      {
        $lookup: {
          from: 'profiles',
          localField: 'receiverId',
          foreignField: 'userId',
          as: 'profile'
        }
      },
      { $unwind: { path: '$profile', preserveNullAndEmptyArrays: true } },
      {
        $project: {
          _id: 1,
          senderId: 1,
          receiverId: 1,
          note: 1,
          status: 1,
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
      },
      { $sort: { createdAt: -1 } }
    ]);
  }
}

module.exports = new ConnectionsRepository();
