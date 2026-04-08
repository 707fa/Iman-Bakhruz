const { redis } = require("../config/redis");
const { getQueueStats } = require("../config/queue");
const { env } = require("../config/env");
const { ok } = require("../utils/response");

async function healthCheck(_req, res, next) {
  try {
    const startedAt = Date.now();
    const redisPong = await redis.ping();

    return ok(res, {
      success: true,
      status: "ok",
      nodeEnv: env.nodeEnv,
      uptimeSeconds: Math.floor(process.uptime()),
      providers: env.providerOrder,
      redis: redisPong,
      queue: getQueueStats(),
      responseMs: Date.now() - startedAt,
    });
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  healthCheck,
};
