const express = require('express');
const router = express.Router();
const followController = require('../controller/follow.controller');
const { authMiddleware } = require('../../../common/middlewares/auth.middleware');
const { 
  followParamsValidator, 
  usernameParamsValidator, 
  paginationQueryValidator 
} = require('../validators/follow.validator');

// All follow actions require authentication
router.use(authMiddleware);

// Follow suggestions
router.get('/suggestions', paginationQueryValidator, followController.getSuggestions);

// Follow status check
router.get('/status/:researcherId', followParamsValidator, followController.getFollowStatus);

// List followers and following lists
router.get('/followers/:username', usernameParamsValidator, paginationQueryValidator, followController.getFollowers);
router.get('/following/:username', usernameParamsValidator, paginationQueryValidator, followController.getFollowing);
router.get('/mutual/:username', usernameParamsValidator, paginationQueryValidator, followController.getMutualFollowers);

// Follow and unfollow actions
router.post('/:researcherId', followParamsValidator, followController.followUser);
router.delete('/:researcherId', followParamsValidator, followController.unfollowUser);

module.exports = router;
