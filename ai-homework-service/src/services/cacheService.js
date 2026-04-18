const { redis } = require("../config/redis");
const { env } = require("../config/env");
const { logger } = require("../utils/logger");

const localCache = new Map();
let redisUnavailableLogged = false;

function nowMs() {
  return Date.now();
}

function getLocal(cacheKey) {
  const item = localCache.get(cacheKey);
  if (!item) return null;
  if (item.expiresAt <= nowMs()) {
    localCache.delete(cacheKey);
    return null;
  }
  return item.value;
}

function setLocal(cacheKey, data, ttlSeconds) {
  localCache.set(cacheKey, {
    value: data,
    expiresAt: nowMs() + ttlSeconds * 1000,
  });
}

function logRedisFallbackOnce(error) {
  if (redisUnavailableLogged) return;
  redisUnavailableLogged = true;
  logger.warn("cache.redis_unavailable_fallback_local", {
    message: error.message,
  });
}

async function getCachedResult(cacheKey) {
  try {
    const raw = await redis.get(cacheKey);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch (error) {
    logRedisFallbackOnce(error);
    return getLocal(cacheKey);
  }
}

async function setCachedResult(cacheKey, data, ttlSeconds = env.cacheTtlSeconds) {
  const value = JSON.stringify(data);
  try {
    await redis.set(cacheKey, value, "EX", ttlSeconds);
  } catch (error) {
    logRedisFallbackOnce(error);
    setLocal(cacheKey, data, ttlSeconds);
  }
}

module.exports = {
  getCachedResult,
  setCachedResult,
};

