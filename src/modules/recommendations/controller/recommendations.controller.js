const recommendationsService = require('../service/recommendations.service');
const asyncHandler = require('../../../common/middlewares/asyncHandler.middleware');

class RecommendationsController {
  getResearchers = asyncHandler(async (req, res) => {
    const { limit = 10, cursor } = req.query;
    
    // Proactively trigger refresh in the background if empty to populate
    const result = await recommendationsService.getRecommendedResearchers(req.user._id, { limit, cursor });
    
    if (result.docs.length === 0 && !cursor) {
      setImmediate(() => recommendationsService.refreshAllRecommendations(req.user._id));
    }
    
    return res.success('Recommended researchers retrieved successfully.', result);
  });

  getPublications = asyncHandler(async (req, res) => {
    const { limit = 10, cursor } = req.query;
    const result = await recommendationsService.getRecommendedPublications(req.user._id, { limit, cursor });
    return res.success('Recommended publications retrieved successfully.', result);
  });



  getProjects = asyncHandler(async (req, res) => {
    const { limit = 10, cursor } = req.query;
    const result = await recommendationsService.getRecommendedProjects(req.user._id, { limit, cursor });
    return res.success('Recommended projects retrieved successfully.', result);
  });

  getFunding = asyncHandler(async (req, res) => {
    const { limit = 10, cursor } = req.query;
    const result = await recommendationsService.getRecommendedFunding(req.user._id, { limit, cursor });
    return res.success('Recommended funding opportunities retrieved successfully.', result);
  });

  getConferences = asyncHandler(async (req, res) => {
    const { limit = 10, cursor } = req.query;
    const result = await recommendationsService.getRecommendedConferences(req.user._id, { limit, cursor });
    return res.success('Recommended conferences retrieved successfully.', result);
  });

  refreshRecommendations = asyncHandler(async (req, res) => {
    // Manually trigger refreshing recommendations
    recommendationsService.refreshAllRecommendations(req.user._id);
    return res.success('Background recommendations calculation started.');
  });
}

module.exports = new RecommendationsController();
