function safeMeta(meta = {}) {
  const clone = { ...meta };
  if (clone.headers) {
    delete clone.headers.authorization;
    delete clone.headers["x-api-key"];
  }
  return clone;
}

function log(level, event, meta) {
  const payload = {
    ts: new Date().toISOString(),
    level,
    event,
    ...safeMeta(meta),
  };
  const line = JSON.stringify(payload);

  if (level === "error") {
    console.error(line);
    return;
  }

  console.log(line);
}

const logger = {
  info(event, meta) {
    log("info", event, meta);
  },
  warn(event, meta) {
    log("warn", event, meta);
  },
  error(event, meta) {
    log("error", event, meta);
  },
};

module.exports = {
  logger,
};
