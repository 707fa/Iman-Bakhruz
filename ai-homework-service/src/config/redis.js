const Redis = require("ioredis");
const { env } = require("./env");
const { logger } = require("../utils/logger");

const redis = new Redis(env.redisUrl, {
  maxRetriesPerRequest: 1,
  enableReadyCheck: false,
  enableOfflineQueue: false,
  lazyConnect: true,
  retryStrategy: () => null,
});

let redisErrorLogged = false;
redis.on("error", (error) => {
  if (redisErrorLogged) return;
  redisErrorLogged = true;
  logger.warn("redis.unavailable", {
    code: error.code,
    message: error.message,
  });
});

module.exports = {
  redis,
};

