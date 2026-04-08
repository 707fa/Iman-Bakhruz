const PQueue = require("p-queue").default;
const { env } = require("./env");
const { logger } = require("../utils/logger");

const queue = new PQueue({
  concurrency: env.queueConcurrency,
  intervalCap: env.queueIntervalCap,
  interval: env.queueIntervalMs,
  carryoverConcurrencyCount: true,
});

async function enqueue(taskFn, meta = {}) {
  const queuedAt = Date.now();

  return queue.add(
    async () => {
      const startedAt = Date.now();
      const waitMs = startedAt - queuedAt;
      logger.info("queue.task.start", {
        requestId: meta.requestId,
        userKey: meta.userKey,
        waitMs,
        queueSize: queue.size,
        pending: queue.pending,
      });

      const result = await taskFn();

      logger.info("queue.task.done", {
        requestId: meta.requestId,
        userKey: meta.userKey,
        durationMs: Date.now() - startedAt,
      });

      return result;
    },
    {
      timeout: env.queueTaskTimeoutMs,
      throwOnTimeout: true,
    }
  );
}

function getQueueStats() {
  return {
    size: queue.size,
    pending: queue.pending,
    concurrency: env.queueConcurrency,
    intervalCap: env.queueIntervalCap,
    intervalMs: env.queueIntervalMs,
  };
}

module.exports = {
  enqueue,
  getQueueStats,
};
