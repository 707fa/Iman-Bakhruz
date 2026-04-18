const { redis } = require("../config/redis");
const { env } = require("../config/env");
const { logger } = require("../utils/logger");

const localCounters = new Map();
let redisUnavailableLogged = false;

function minuteWindowKey(userKey) {
  const now = new Date();
  const y = now.getUTCFullYear();
  const m = String(now.getUTCMonth() + 1).padStart(2, "0");
  const d = String(now.getUTCDate()).padStart(2, "0");
  const h = String(now.getUTCHours()).padStart(2, "0");
  const min = String(now.getUTCMinutes()).padStart(2, "0");
  return `${env.redisPrefix}:rl:min:${userKey}:${y}${m}${d}${h}${min}`;
}

function dayWindowKey(userKey) {
  const now = new Date();
  const y = now.getUTCFullYear();
  const m = String(now.getUTCMonth() + 1).padStart(2, "0");
  const d = String(now.getUTCDate()).padStart(2, "0");
  return `${env.redisPrefix}:rl:day:${userKey}:${y}${m}${d}`;
}

function ttlToNextUtcMidnight() {
  const now = new Date();
  const tomorrow = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1, 0, 0, 0));
  return Math.max(1, Math.floor((tomorrow.getTime() - now.getTime()) / 1000));
}

function logRedisFallbackOnce(error) {
  if (redisUnavailableLogged) return;
  redisUnavailableLogged = true;
  logger.warn("rate_limit.redis_unavailable_fallback_local", {
    message: error.message,
  });
}

function consumeLocalCounter(key, ttlSeconds) {
  const now = Date.now();
  const prev = localCounters.get(key);
  if (!prev || prev.expiresAt <= now) {
    const next = { count: 1, expiresAt: now + ttlSeconds * 1000 };
    localCounters.set(key, next);
    return next.count;
  }

  prev.count += 1;
  localCounters.set(key, prev);
  return prev.count;
}

async function consumeViaRedis(minKey, dayKey) {
  const pipeline = redis.pipeline();
  pipeline.incr(minKey);
  pipeline.ttl(minKey);
  pipeline.incr(dayKey);
  pipeline.ttl(dayKey);
  const results = await pipeline.exec();
  if (!results || results.some((entry) => entry?.[0])) {
    const firstError = results?.find((entry) => entry?.[0])?.[0];
    throw firstError || new Error("Redis pipeline failed");
  }

  const minCount = Number(results?.[0]?.[1] || 0);
  const minTtl = Number(results?.[1]?.[1] || -1);
  const dayCount = Number(results?.[2]?.[1] || 0);
  const dayTtl = Number(results?.[3]?.[1] || -1);

  const setupPipeline = redis.pipeline();
  let hasSetupCommands = false;
  if (minTtl < 0) {
    setupPipeline.expire(minKey, 120);
    hasSetupCommands = true;
  }
  if (dayTtl < 0) {
    setupPipeline.expire(dayKey, ttlToNextUtcMidnight());
    hasSetupCommands = true;
  }
  if (hasSetupCommands) {
    const setupResults = await setupPipeline.exec();
    if (!setupResults || setupResults.some((entry) => entry?.[0])) {
      const firstError = setupResults?.find((entry) => entry?.[0])?.[0];
      throw firstError || new Error("Redis setup pipeline failed");
    }
  }

  return { minCount, dayCount };
}

function consumeViaLocal(minKey, dayKey) {
  const minCount = consumeLocalCounter(minKey, 120);
  const dayCount = consumeLocalCounter(dayKey, ttlToNextUtcMidnight());
  return { minCount, dayCount };
}

async function consumeUserQuota(userKey) {
  const minKey = minuteWindowKey(userKey);
  const dayKey = dayWindowKey(userKey);

  let counters;
  try {
    counters = await consumeViaRedis(minKey, dayKey);
  } catch (error) {
    logRedisFallbackOnce(error);
    counters = consumeViaLocal(minKey, dayKey);
  }

  const minCount = counters.minCount;
  const dayCount = counters.dayCount;

  return {
    minCount,
    dayCount,
    minLimit: env.rateLimitPerMinute,
    dayLimit: env.rateLimitPerDay,
    exceededMinute: minCount > env.rateLimitPerMinute,
    exceededDay: dayCount > env.rateLimitPerDay,
  };
}

module.exports = {
  consumeUserQuota,
};
