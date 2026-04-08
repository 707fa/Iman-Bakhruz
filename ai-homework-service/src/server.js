const http = require("http");
const app = require("./app");
const { env, validateEnv } = require("./config/env");
const { redis } = require("./config/redis");
const { logger } = require("./utils/logger");

async function bootstrap() {
  validateEnv();

  try {
    await redis.ping();
  } catch (error) {
    logger.error("bootstrap.redis_failed", { message: error.message });
    process.exit(1);
  }

  const server = http.createServer(app);

  server.listen(env.port, () => {
    logger.info("server.started", {
      port: env.port,
      nodeEnv: env.nodeEnv,
      providers: env.providerOrder,
    });
  });

  function shutdown(signal) {
    logger.warn("server.shutdown", { signal });
    server.close(async () => {
      try {
        await redis.quit();
      } catch (error) {
        logger.error("server.redis_quit_failed", { message: error.message });
      }
      process.exit(0);
    });
  }

  process.on("SIGINT", () => shutdown("SIGINT"));
  process.on("SIGTERM", () => shutdown("SIGTERM"));
}

bootstrap().catch((error) => {
  logger.error("server.bootstrap_failed", {
    message: error.message,
    code: error.code,
  });
  process.exit(1);
});
