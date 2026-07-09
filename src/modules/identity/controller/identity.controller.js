const identityService = require('../service/identity.service');

class IdentityController {
  async connectProvider(req, res, next) {
    try {
      const userId = req.user.id || req.user._id;
      const result = await identityService.connectProvider(userId, req.body);
      
      res.status(200).json({
        success: true,
        message: result.message,
        data: result.provider,
        error: null
      });
    } catch (err) {
      next(err);
    }
  }

  async disconnectProvider(req, res, next) {
    try {
      const userId = req.user.id || req.user._id;
      const { provider } = req.body;
      const result = await identityService.disconnectProvider(userId, provider);

      res.status(200).json({
        success: true,
        message: result.message,
        data: null,
        error: null
      });
    } catch (err) {
      next(err);
    }
  }

  async triggerSync(req, res, next) {
    try {
      const userId = req.user.id || req.user._id;
      const { provider } = req.body;
      const result = await identityService.triggerSync(userId, provider);

      res.status(200).json({
        success: true,
        message: result.message,
        data: { jobId: result.jobId },
        error: null
      });
    } catch (err) {
      next(err);
    }
  }

  async getProfile(req, res, next) {
    try {
      const userId = req.user.id || req.user._id;
      const profile = await identityService.getProfile(userId);

      res.status(200).json({
        success: true,
        message: 'Academic profile retrieved successfully',
        data: profile,
        error: null
      });
    } catch (err) {
      next(err);
    }
  }

  async getProviders(req, res, next) {
    try {
      const userId = req.user.id || req.user._id;
      const providers = await identityService.getProviders(userId);

      res.status(200).json({
        success: true,
        message: 'Identity providers connections retrieved successfully',
        data: providers,
        error: null
      });
    } catch (err) {
      next(err);
    }
  }

  async getMetrics(req, res, next) {
    try {
      const userId = req.user.id || req.user._id;
      const metrics = await identityService.getMetrics(userId);

      res.status(200).json({
        success: true,
        message: 'Academic metrics retrieved successfully',
        data: metrics,
        error: null
      });
    } catch (err) {
      next(err);
    }
  }

  async getCoAuthors(req, res, next) {
    try {
      const userId = req.user.id || req.user._id;
      const coAuthors = await identityService.getCoAuthors(userId);

      res.status(200).json({
        success: true,
        message: 'Co-authors collaboration data retrieved successfully',
        data: coAuthors,
        error: null
      });
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new IdentityController();
