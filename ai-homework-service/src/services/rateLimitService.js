const { redis } = require("../config/redis");
const { env } = require("../config/env");

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

async function consumeUserQuota(userKey) {
  const minKey = minuteWindowKey(userKey);
  const dayKey = dayWindowKey(userKey);

  const pipeline = redis.pipeline();
  pipeline.incr(minKey);
  pipeline.ttl(minKey);
  pipeline.incr(dayKey);
  pipeline.ttl(dayKey);
  const results = await pipeline.exec();

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
    await setupPipeline.exec();
  }

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
