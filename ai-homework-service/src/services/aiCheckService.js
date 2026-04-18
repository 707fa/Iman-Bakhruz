const { env } = require("../config/env");
const { enqueue } = require("../config/queue");
const { getCachedResult, setCachedResult } = require("./cacheService");
const { analyzeWithFallback } = require("./fallbackManager");
const { buildCacheKeyFromImage, buildCacheKeyFromText } = require("../utils/hash");
const { logger } = require("../utils/logger");

function buildCacheKey({ text, imageBuffer }) {
  if (imageBuffer) {
    return buildCacheKeyFromImage(env.redisPrefix, imageBuffer, text || "");
  }
  return buildCacheKeyFromText(env.redisPrefix, text || "");
}

async function analyzeHomework(input, context) {
  const cacheKey = buildCacheKey(input);

  const cached = await getCachedResult(cacheKey);
  if (cached && typeof cached.result === "string") {
    logger.info("cache.hit", {
      requestId: context.requestId,
      userKey: context.userKey,
    });

    return {
      success: true,
      provider: "cache",
      cached: true,
      result: cached.result,
    };
  }

  logger.info("cache.miss", {
    requestId: context.requestId,
    userKey: context.userKey,
  });

  const output = await enqueue(
    () => analyzeWithFallback(input, context),
    {
      requestId: context.requestId,
      userKey: context.userKey,
    }
  );

  await setCachedResult(
    cacheKey,
    {
      result: output.result,
      provider: output.provider,
      createdAt: new Date().toISOString(),
    },
    env.cacheTtlSeconds
  );

  return {
    success: true,
    provider: output.provider,
    cached: false,
    result: output.result,
  };
}

module.exports = {
  analyzeHomework,
};
