const axios = require("axios");
const { ProviderError, isRetryableHttpStatus } = require("./errors");

function createHttpClient(baseURL, timeout) {
  return axios.create({
    baseURL,
    timeout,
    validateStatus: () => true,
  });
}

function extractTextFromOpenAIStyle(content) {
  if (typeof content === "string") return content;
  if (!Array.isArray(content)) return "";

  const parts = content
    .map((part) => {
      if (typeof part === "string") return part;
      if (part && typeof part.text === "string") return part.text;
      return "";
    })
    .filter(Boolean);

  return parts.join("\n").trim();
}

function throwProviderHttpError({ provider, status, data, message }) {
  const msg = message || data?.error?.message || data?.message || `Provider ${provider} request failed`;

  const lower = String(msg || "").toLowerCase();
  const quotaOrLimit =
    lower.includes("quota") ||
    lower.includes("rate limit") ||
    lower.includes("resource exhausted") ||
    lower.includes("too many requests");
  const unsupportedImage =
    status === 400 &&
    (lower.includes("image") || lower.includes("vision") || lower.includes("multimodal") || lower.includes("unsupported"));
  const retryable = isRetryableHttpStatus(status);
  const fallbackAllowed = unsupportedImage || quotaOrLimit || retryable;
  const code = unsupportedImage
    ? "PROVIDER_UNSUPPORTED_IMAGE"
    : quotaOrLimit
      ? "PROVIDER_QUOTA_EXCEEDED"
      : "PROVIDER_HTTP_ERROR";

  throw new ProviderError(msg, {
    provider,
    statusCode: status || 502,
    code,
    retryable,
    fallbackAllowed,
    details: {
      provider,
      status,
    },
  });
}

function throwProviderNetworkError({ provider, error }) {
  throw new ProviderError(`Provider ${provider} network error: ${error.message}`, {
    provider,
    statusCode: 502,
    code: "PROVIDER_NETWORK_ERROR",
    retryable: true,
    fallbackAllowed: true,
  });
}

module.exports = {
  createHttpClient,
  extractTextFromOpenAIStyle,
  throwProviderHttpError,
  throwProviderNetworkError,
};
