const { consumeUserQuota } = require("../services/rateLimitService");
const { AppError } = require("../utils/errors");
const { logger } = require("../utils/logger");

async function rateLimitMiddleware(req, _res, next) {
  const userKey = req.userIdentity?.key || `ip:${req.ip}`;

  try {
    const quota = await consumeUserQuota(userKey);

    logger.info("rate_limit.consume", {
      requestId: req.requestId,
      userKey,
      minCount: quota.minCount,
      dayCount: quota.dayCount,
      minLimit: quota.minLimit,
      dayLimit: quota.dayLimit,
    });

    if (quota.exceededMinute || quota.exceededDay) {
      const message = quota.exceededMinute
        ? `Rate limit exceeded: max ${quota.minLimit} requests per minute`
        : `Rate limit exceeded: max ${quota.dayLimit} requests per day`;

      throw new AppError(message, {
        statusCode: 429,
        code: "RATE_LIMIT_EXCEEDED",
        details: {
          minute: `${quota.minCount}/${quota.minLimit}`,
          day: `${quota.dayCount}/${quota.dayLimit}`,
        },
      });
    }

    next();
  } catch (error) {
    if (error instanceof AppError) {
      return next(error);
    }

    return next(
      new AppError("Rate limiter is temporarily unavailable", {
        statusCode: 503,
        code: "RATE_LIMIT_UNAVAILABLE",
      })
    );
  }
}

module.exports = {
  rateLimitMiddleware,
};
