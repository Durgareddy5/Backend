const analyticsService = require('../service/analytics.service');
const asyncHandler = require('../../../common/middlewares/asyncHandler.middleware');

class AnalyticsController {
  // GET /api/v1/publications/:id/analytics
  getPublicationAnalytics = asyncHandler(async (req, res) => {
    const result = await analyticsService.getPublicationAnalytics(req.params.id, req.user._id);
    return res.success('Analytics retrieved successfully.', result);
  });

  // GET /api/v1/publications/:id/analytics/views
  getViewsTimeline = asyncHandler(async (req, res) => {
    const { period = '30d' } = req.query;
    const result = await analyticsService.getViewsTimeline(req.params.id, period);
    return res.success('Views timeline retrieved.', result);
  });

  // GET /api/v1/publications/:id/analytics/downloads
  getDownloadsTimeline = asyncHandler(async (req, res) => {
    const { period = '30d' } = req.query;
    const result = await analyticsService.getDownloadsTimeline(req.params.id, period);
    return res.success('Downloads timeline retrieved.', result);
  });

  // GET /api/v1/profile/:profileSlug/publication-analytics
  getProfileAnalytics = asyncHandler(async (req, res) => {
    const result = await analyticsService.getProfilePublicationAnalytics(
      req.params.profileSlug,
      req.user._id
    );
    return res.success('Profile analytics retrieved.', result);
  });
}

module.exports = new AnalyticsController();
