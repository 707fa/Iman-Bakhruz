function sanitizeUserId(value) {
  if (!value) return null;
  const str = String(value).trim();
  return str ? str : null;
}

function getClientIp(req) {
  const forwarded = req.headers["x-forwarded-for"];
  if (forwarded) {
    return String(forwarded).split(",")[0].trim();
  }
  return req.ip || req.socket?.remoteAddress || "unknown";
}

function userKeyMiddleware(req, _res, next) {
  const headerUserId = sanitizeUserId(req.headers["x-user-id"]);
  const bodyUserId = sanitizeUserId(req.body?.userId);
  const queryUserId = sanitizeUserId(req.query?.userId);

  const userId = headerUserId || bodyUserId || queryUserId;
  const ip = getClientIp(req);

  req.userIdentity = {
    userId,
    ip,
    key: userId ? `uid:${userId}` : `ip:${ip}`,
  };

  next();
}

module.exports = {
  userKeyMiddleware,
};
