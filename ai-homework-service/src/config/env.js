const path = require("path");
const dotenv = require("dotenv");

dotenv.config({ path: process.env.ENV_FILE || path.resolve(process.cwd(), ".env") });

function toNumber(value, fallback) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function toCsv(value, fallback) {
  const raw = (value || fallback || "").trim();
  return raw
    .split(",")
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);
}

function toCsvRaw(value, fallback) {
  const raw = (value || fallback || "").trim();
  return raw
    .split(",")
    .map((item) => item.trim().replace(/\/+$/, ""))
    .filter(Boolean);
}

const env = {
  nodeEnv: process.env.NODE_ENV || "development",
  port: toNumber(process.env.PORT, 8080),
  corsAllowedOrigins: toCsvRaw(process.env.CORS_ALLOWED_ORIGINS, "http://127.0.0.1:5188,http://localhost:5188"),

  redisUrl: process.env.REDIS_URL || "redis://127.0.0.1:6379",
  redisPrefix: process.env.REDIS_PREFIX || "aihw",

  cacheTtlSeconds: toNumber(process.env.CACHE_TTL_SECONDS, 86400),

  rateLimitPerMinute: toNumber(process.env.RATE_LIMIT_PER_MINUTE, 8),
  rateLimitPerDay: toNumber(process.env.RATE_LIMIT_PER_DAY, 220),

  queueConcurrency: toNumber(process.env.QUEUE_CONCURRENCY, 1),
  queueIntervalCap: toNumber(process.env.QUEUE_INTERVAL_CAP, 8),
  queueIntervalMs: toNumber(process.env.QUEUE_INTERVAL_MS, 60000),
  queueTaskTimeoutMs: toNumber(process.env.QUEUE_TASK_TIMEOUT_MS, 60000),

  aiRequestTimeoutMs: toNumber(process.env.AI_REQUEST_TIMEOUT_MS, 30000),
  aiRetryAttempts: toNumber(process.env.AI_RETRY_ATTEMPTS, 2),
  aiRetryBackoffMs: toNumber(process.env.AI_RETRY_BACKOFF_MS, 600),

  maxImageBytes: toNumber(process.env.MAX_IMAGE_BYTES, 6 * 1024 * 1024),

  providerOrder: toCsv(process.env.PROVIDER_ORDER, "gemini"),

  geminiApiKey: (process.env.GEMINI_API_KEY || "").trim(),
  geminiModel: process.env.GEMINI_MODEL || "gemini-2.5-flash",

  deepseekApiKey: (process.env.DEEPSEEK_API_KEY || "").trim(),
  deepseekModel: process.env.DEEPSEEK_MODEL || "deepseek-chat",
  deepseekBaseUrl: process.env.DEEPSEEK_BASE_URL || "https://api.deepseek.com",

  openrouterApiKey: (process.env.OPENROUTER_API_KEY || "").trim(),
  openrouterModel: process.env.OPENROUTER_MODEL || "openai/gpt-4o-mini",
  openrouterBaseUrl: process.env.OPENROUTER_BASE_URL || "https://openrouter.ai/api/v1",
  openrouterSiteUrl: process.env.OPENROUTER_SITE_URL || "http://localhost:8080",
  openrouterAppName: process.env.OPENROUTER_APP_NAME || "AI Homework Service",
};

function requiredForProviders() {
  const errors = [];

  if (env.providerOrder.includes("gemini") && !env.geminiApiKey) {
    errors.push("GEMINI_API_KEY is required because gemini is in PROVIDER_ORDER");
  }

  if (env.providerOrder.includes("deepseek") && !env.deepseekApiKey) {
    errors.push("DEEPSEEK_API_KEY is required because deepseek is in PROVIDER_ORDER");
  }

  if (env.providerOrder.includes("openrouter") && !env.openrouterApiKey) {
    errors.push("OPENROUTER_API_KEY is required because openrouter is in PROVIDER_ORDER");
  }

  return errors;
}

function validateEnv() {
  const errors = requiredForProviders();

  if (env.queueConcurrency < 1) {
    errors.push("QUEUE_CONCURRENCY must be >= 1");
  }

  if (env.cacheTtlSeconds < 1) {
    errors.push("CACHE_TTL_SECONDS must be >= 1");
  }

  if (errors.length) {
    const e = new Error(`Invalid environment: ${errors.join("; ")}`);
    e.code = "ENV_INVALID";
    throw e;
  }
}

module.exports = {
  env,
  validateEnv,
};
