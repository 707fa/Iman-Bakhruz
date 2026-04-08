class AppError extends Error {
  constructor(message, options = {}) {
    super(message);
    this.name = "AppError";
    this.statusCode = options.statusCode || 500;
    this.code = options.code || "INTERNAL_ERROR";
    this.details = options.details || null;
    this.expose = options.expose !== undefined ? options.expose : this.statusCode < 500;
  }
}

class ProviderError extends AppError {
  constructor(message, options = {}) {
    super(message, {
      statusCode: options.statusCode || 502,
      code: options.code || "PROVIDER_ERROR",
      details: options.details || null,
      expose: false,
    });

    this.name = "ProviderError";
    this.provider = options.provider || "unknown";
    this.retryable = Boolean(options.retryable);
    this.fallbackAllowed = options.fallbackAllowed !== undefined ? options.fallbackAllowed : this.retryable;
  }
}

function isRetryableHttpStatus(status) {
  return [408, 409, 425, 429, 500, 502, 503, 504].includes(Number(status));
}

function shouldFallback(error) {
  if (!error) return false;
  if (error instanceof ProviderError) {
    return Boolean(error.fallbackAllowed);
  }
  return false;
}

module.exports = {
  AppError,
  ProviderError,
  isRetryableHttpStatus,
  shouldFallback,
};
