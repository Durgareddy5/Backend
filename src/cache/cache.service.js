class CacheService {
  constructor() {
    this.cache = new Map();
    this.redisClient = null; // Ready for Redis connection scaling
  }

  async get(key) {
    if (this.redisClient) {
      try {
        const val = await this.redisClient.get(key);
        return val ? JSON.parse(val) : null;
      } catch (err) {
        console.error('Redis cache get error:', err);
      }
    }
    const item = this.cache.get(key);
    if (!item) return null;
    if (item.expiry && Date.now() > item.expiry) {
      this.cache.delete(key);
      return null;
    }
    return item.value;
  }

  async set(key, value, ttlSeconds = 300) {
    if (this.redisClient) {
      try {
        await this.redisClient.set(key, JSON.stringify(value), { EX: ttlSeconds });
        return true;
      } catch (err) {
        console.error('Redis cache set error:', err);
      }
    }
    const expiry = ttlSeconds ? Date.now() + (ttlSeconds * 1000) : null;
    this.cache.set(key, { value, expiry });
    return true;
  }

  async del(key) {
    if (this.redisClient) {
      try {
        await this.redisClient.del(key);
        return true;
      } catch (err) {
        console.error('Redis cache del error:', err);
      }
    }
    return this.cache.delete(key);
  }

  async flush() {
    if (this.redisClient) {
      try {
        await this.redisClient.flushAll();
        return true;
      } catch (err) {
        console.error('Redis cache flush error:', err);
      }
    }
    this.cache.clear();
    return true;
  }
}

const cacheInstance = new CacheService();

// Domain caches
const ScholarCache = {
  get: async (userId) => cacheInstance.get(`scholar:${userId}`),
  set: async (userId, data, ttl = 1800) => cacheInstance.set(`scholar:${userId}`, data, ttl),
  del: async (userId) => cacheInstance.del(`scholar:${userId}`)
};

const ProfileCache = {
  get: async (userId) => cacheInstance.get(`profile:${userId}`),
  set: async (userId, data, ttl = 600) => cacheInstance.set(`profile:${userId}`, data, ttl),
  del: async (userId) => cacheInstance.del(`profile:${userId}`)
};

const FeedCache = {
  get: async (key) => cacheInstance.get(`feed:${key}`),
  set: async (key, data, ttl = 300) => cacheInstance.set(`feed:${key}`, data, ttl),
  del: async (key) => cacheInstance.del(`feed:${key}`),
  flush: async () => cacheInstance.flush()
};

const PublicationCache = {
  get: async (slugOrId) => cacheInstance.get(`pub:${slugOrId}`),
  set: async (slugOrId, data, ttl = 900) => cacheInstance.set(`pub:${slugOrId}`, data, ttl),
  del: async (slugOrId) => cacheInstance.del(`pub:${slugOrId}`)
};

const AIPromptCache = {
  get: async (key) => cacheInstance.get(`ai:prompt:${key}`),
  set: async (key, data, ttl = 3600) => cacheInstance.set(`ai:prompt:${key}`, data, ttl),
  del: async (key) => cacheInstance.del(`ai:prompt:${key}`)
};

module.exports = {
  cacheService: cacheInstance,
  ScholarCache,
  ProfileCache,
  FeedCache,
  PublicationCache,
  AIPromptCache
};
