const { redis } = require("../config/redis");
const { getQueueStats } = require("../config/queue");
const { env } = require("../config/env");
const { ok } = require("../utils/response");

async function healthCheck(_req, res, _next) {
  const startedAt = Date.now();
  let redisState = "unavailable";

  try {
    const redisPong = await redis.ping();
    redisState = redisPong || "ok";
  } catch {
    redisState = "unavailable";
  }

  return ok(res, {
    success: true,
    status: "ok",
    nodeEnv: env.nodeEnv,
    uptimeSeconds: Math.floor(process.uptime()),
    providers: env.providerOrder,
    redis: redisState,
    queue: getQueueStats(),
    responseMs: Date.now() - startedAt,
  });
}

module.exports = {
  healthCheck,
};

