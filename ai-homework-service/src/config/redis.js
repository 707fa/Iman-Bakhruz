const Redis = require("ioredis");
const { env } = require("./env");

const redis = new Redis(env.redisUrl, {
  maxRetriesPerRequest: 2,
  enableReadyCheck: true,
  lazyConnect: false,
});

redis.on("error", (error) => {
  console.error("[redis] error", {
    code: error.code,
    message: error.message,
  });
});

module.exports = {
  redis,
};
