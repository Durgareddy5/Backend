const landingService = require('../service/landing.service');
const landingDTO = require('../dto/landing.dto');
const asyncHandler = require('../../../common/middlewares/asyncHandler.middleware');

class LandingController {
  getWelcome = asyncHandler(async (req, res) => {
    return res.success('Welcome to Research Connect API', {
      projectName: 'Research Connect',
      status: 'Online',
      docs: '/api/docs'
    });
  });

  getHealth = asyncHandler(async (req, res) => {
    const health = await landingService.getHealth();
    return res.success('Server health retrieved successfully', landingDTO.formatHealth(health));
  });

  getDatabaseHealth = asyncHandler(async (req, res) => {
    const dbHealth = await landingService.getDatabaseHealth();
    const formatted = landingDTO.formatDatabase(dbHealth);
    return res.success('Database health retrieved successfully', formatted);
  });

  getStats = asyncHandler(async (req, res) => {
    const stats = await landingService.getStats();
    return res.success('Platform stats retrieved successfully', landingDTO.formatStats(stats));
  });

  getCategories = asyncHandler(async (req, res) => {
    const categories = await landingService.getCategories();
    return res.success('Research categories retrieved successfully', landingDTO.formatCategories(categories));
  });

  getFeatures = asyncHandler(async (req, res) => {
    const features = await landingService.getFeatures();
    return res.success('Platform features retrieved successfully', landingDTO.formatFeatures(features));
  });

  getVersion = asyncHandler(async (req, res) => {
    const version = await landingService.getVersion();
    return res.success('Platform version retrieved successfully', version);
  });
}

module.exports = new LandingController();
