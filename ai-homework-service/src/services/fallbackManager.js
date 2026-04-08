const { env } = require("../config/env");
const { AppError, ProviderError, shouldFallback } = require("../utils/errors");
const { logger } = require("../utils/logger");
const geminiProvider = require("../providers/geminiProvider");
const deepseekProvider = require("../providers/deepseekProvider");
const openrouterProvider = require("../providers/openrouterProvider");

const providerMap = {
  gemini: geminiProvider,
  deepseek: deepseekProvider,
  openrouter: openrouterProvider,
};

function getOrderedProviders() {
  return env.providerOrder.map((name) => providerMap[name]).filter(Boolean);
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function callProviderWithRetry(provider, methodName, payload, context) {
  let attempt = 0;
  const maxAttempts = Math.max(1, env.aiRetryAttempts);

  while (attempt < maxAttempts) {
    attempt += 1;

    try {
      logger.info("provider.call", {
        requestId: context.requestId,
        userKey: context.userKey,
        provider: provider.name,
        method: methodName,
        attempt,
      });

      const startedAt = Date.now();
      const result = await provider[methodName](payload);

      logger.info("provider.success", {
        requestId: context.requestId,
        userKey: context.userKey,
        provider: provider.name,
        method: methodName,
        attempt,
        durationMs: Date.now() - startedAt,
      });

      return result;
    } catch (error) {
      const providerError =
        error instanceof ProviderError
          ? error
          : new ProviderError(`Provider ${provider.name} failed: ${error.message}`, {
              provider: provider.name,
              retryable: true,
              fallbackAllowed: true,
            });

      logger.warn("provider.error", {
        requestId: context.requestId,
        userKey: context.userKey,
        provider: provider.name,
        method: methodName,
        attempt,
        code: providerError.code,
        statusCode: providerError.statusCode,
        retryable: providerError.retryable,
        fallbackAllowed: providerError.fallbackAllowed,
      });

      const canRetry = providerError.retryable && attempt < maxAttempts;
      if (canRetry) {
        const backoffMs = env.aiRetryBackoffMs * attempt;
        await sleep(backoffMs);
        continue;
      }

      throw providerError;
    }
  }

  throw new ProviderError(`Provider ${provider.name} exhausted retries`, {
    provider: provider.name,
    retryable: true,
    fallbackAllowed: true,
  });
}

async function analyzeWithFallback(input, context) {
  const ordered = getOrderedProviders();
  if (!ordered.length) {
    throw new AppError("No AI providers configured", {
      statusCode: 500,
      code: "NO_PROVIDERS",
      expose: false,
    });
  }

  const methodName = input.imageBuffer ? "analyzeImage" : "analyzeText";
  const errors = [];

  for (let i = 0; i < ordered.length; i += 1) {
    const provider = ordered[i];
    const isLast = i === ordered.length - 1;

    try {
      const result = await callProviderWithRetry(provider, methodName, input, context);
      return {
        provider: provider.name,
        result,
        fallbackUsed: i > 0,
      };
    } catch (error) {
      errors.push({ provider: provider.name, code: error.code, statusCode: error.statusCode });

      if (!shouldFallback(error) || isLast) {
        break;
      }

      logger.warn("provider.fallback", {
        requestId: context.requestId,
        userKey: context.userKey,
        fromProvider: provider.name,
        nextProvider: ordered[i + 1]?.name || null,
      });
    }
  }

  throw new AppError("All AI providers are temporarily unavailable", {
    statusCode: 503,
    code: "ALL_PROVIDERS_UNAVAILABLE",
    details: { providersTried: errors },
  });
}

module.exports = {
  analyzeWithFallback,
};
