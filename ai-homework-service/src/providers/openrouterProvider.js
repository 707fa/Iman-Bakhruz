const { env } = require("../config/env");
const { createOpenAIStyleProvider } = require("./openaiStyleProvider");

module.exports = createOpenAIStyleProvider({
  name: "openrouter",
  baseUrl: env.openrouterBaseUrl,
  model: env.openrouterModel,
  apiKey: env.openrouterApiKey,
  timeoutMs: env.aiRequestTimeoutMs,
  extraHeaders: {
    "HTTP-Referer": env.openrouterSiteUrl,
    "X-Title": env.openrouterAppName,
  },
});
