const { cacheService } = require('./cache.service');

const responseCacheMiddleware = (ttlSeconds = 60) => {
  return async (req, res, next) => {
    // Only cache GET requests
    if (req.method !== 'GET') {
      return next();
    }

    const userId = req.user ? req.user._id.toString() : 'guest';
    const cacheKey = `response:${userId}:${req.originalUrl || req.url}`;

    try {
      const cachedResponse = await cacheService.get(cacheKey);
      if (cachedResponse) {
        return res.status(200).json(cachedResponse);
      }

      // Override res.json to capture response payload
      const originalJson = res.json;
      res.json = function (body) {
        if (res.statusCode === 200 && body && body.success) {
          cacheService.set(cacheKey, body, ttlSeconds).catch(err => {
            console.error('Error setting response cache:', err);
          });
        }
        return originalJson.call(this, body);
      };

      next();
    } catch (err) {
      console.error('Response cache middleware error:', err);
      next();
    }
  };
};

module.exports = responseCacheMiddleware;
