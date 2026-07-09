const followService = require('../service/follow.service');
const asyncHandler = require('../../../common/middlewares/asyncHandler.middleware');

class FollowController {
  // Follow a researcher
  followUser = asyncHandler(async (req, res) => {
    const { researcherId } = req.params;
    const followDoc = await followService.follow(req.user._id, researcherId);
    return res.success('Successfully followed the researcher.', followDoc);
  });

  // Unfollow a researcher
  unfollowUser = asyncHandler(async (req, res) => {
    const { researcherId } = req.params;
    const result = await followService.unfollow(req.user._id, researcherId);
    return res.success('Successfully unfollowed the researcher.', result);
  });

  // Get followers of a researcher
  getFollowers = asyncHandler(async (req, res) => {
    const { username } = req.params;
    const { limit = 10, cursor, search = '' } = req.query;
    const followers = await followService.getFollowers(username, { 
      limit: Number(limit), 
      cursor, 
      search 
    });
    return res.success('Followers list retrieved successfully.', followers);
  });

  // Get following list of a researcher
  getFollowing = asyncHandler(async (req, res) => {
    const { username } = req.params;
    const { limit = 10, cursor, search = '' } = req.query;
    const following = await followService.getFollowing(username, { 
      limit: Number(limit), 
      cursor, 
      search 
    });
    return res.success('Following list retrieved successfully.', following);
  });

  // Get mutual followers list
  getMutualFollowers = asyncHandler(async (req, res) => {
    const { username } = req.params;
    const { limit = 10, cursor } = req.query;
    const mutuals = await followService.getMutualFollowers(req.user._id, username, { 
      limit: Number(limit), 
      cursor 
    });
    return res.success('Mutual followers list retrieved successfully.', mutuals);
  });

  // Get follow suggestions / recommendations
  getSuggestions = asyncHandler(async (req, res) => {
    const { limit = 10, page = 1 } = req.query;
    const suggestions = await followService.getSuggestions(req.user._id, { 
      limit: Number(limit), 
      page: Number(page) 
    });
    return res.success('Recommended researchers retrieved successfully.', suggestions);
  });

  // Get status of follow with a specific researcher
  getFollowStatus = asyncHandler(async (req, res) => {
    const { researcherId } = req.params;
    const status = await followService.getFollowStatus(req.user._id, researcherId);
    return res.success('Follow status retrieved successfully.', status);
  });
}

module.exports = new FollowController();
