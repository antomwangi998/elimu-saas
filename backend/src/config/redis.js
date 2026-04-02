// ============================================================
// Redis Configuration — Optional Caching & Session Store
// ============================================================
const redis = require('redis');
const logger = require('./logger');

let client = null;

const connectRedis = async () => {
  if (!process.env.REDIS_URL && process.env.NODE_ENV === 'production') {
    logger.warn('⚠️  No REDIS_URL set — running without cache');
    return null;
  }
  const redisUrl = process.env.REDIS_URL ||
    `redis://${process.env.REDIS_HOST || 'localhost'}:${process.env.REDIS_PORT || 6379}`;
  try {
    client = redis.createClient({
      url: redisUrl,
      socket: {
        connectTimeout: 5000,
        reconnectStrategy: (retries) => {
          if (retries > 5) return false;
          return Math.min(retries * 200, 2000);
        },
      },
    });
    client.on('error', (err) => logger.warn('Redis error (non-fatal):', err.message));
    client.on('ready', () => logger.info('✅ Redis ready'));
    await client.connect();
    return client;
  } catch (err) {
    logger.warn('⚠️  Redis unavailable (continuing without cache):', err.message);
    client = null;
    return null;
  }
};

const getRedis = () => client;

// ── Cache Helpers (no-op if Redis unavailable) ────────────────
const cache = {
  async get(key) {
    try {
      if (!client) return null;
      const val = await client.get(key);
      return val ? JSON.parse(val) : null;
    } catch { return null; }
  },
  async set(key, value, ttlSeconds = 300) {
    try {
      if (!client) return;
      await client.setEx(key, ttlSeconds, JSON.stringify(value));
    } catch (err) { logger.warn('Cache set error:', err.message); }
  },
  async del(key) {
    try {
      if (!client) return;
      await client.del(key);
    } catch {}
  },
  async delPattern(pattern) {
    try {
      if (!client) return;
      const keys = await client.keys(pattern);
      if (keys.length > 0) await client.del(keys);
    } catch {}
  },
  async remember(key, ttl, fn) {
    const cached = await this.get(key);
    if (cached !== null) return cached;
    const result = await fn();
    await this.set(key, result, ttl);
    return result;
  },
};

const rateLimitIncr = async (key, windowSecs) => {
  try {
    if (!client) return 0;
    const multi = client.multi();
    multi.incr(key);
    multi.expire(key, windowSecs);
    const results = await multi.exec();
    return results[0];
  } catch { return 0; }
};

const session = {
  async set(token, data, ttl = 604800) { await cache.set(`session:${token}`, data, ttl); },
  async get(token) { return await cache.get(`session:${token}`); },
  async destroy(token) { await cache.del(`session:${token}`); },
  async blacklist(token, ttl = 604800) { await cache.set(`blacklist:${token}`, true, ttl); },
  async isBlacklisted(token) { return !!(await cache.get(`blacklist:${token}`)); },
};

module.exports = { connectRedis, getRedis, cache, rateLimitIncr, session };
