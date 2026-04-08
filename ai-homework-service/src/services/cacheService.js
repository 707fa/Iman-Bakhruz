const { redis } = require("../config/redis");
const { env } = require("../config/env");

async function getCachedResult(cacheKey) {
  const raw = await redis.get(cacheKey);
  if (!raw) return null;

  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

async function setCachedResult(cacheKey, data, ttlSeconds = env.cacheTtlSeconds) {
  const value = JSON.stringify(data);
  await redis.set(cacheKey, value, "EX", ttlSeconds);
}

module.exports = {
  getCachedResult,
  setCachedResult,
};
