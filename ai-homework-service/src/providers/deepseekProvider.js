const { env } = require("../config/env");
const { createOpenAIStyleProvider } = require("./openaiStyleProvider");

module.exports = createOpenAIStyleProvider({
  name: "deepseek",
  baseUrl: env.deepseekBaseUrl,
  model: env.deepseekModel,
  apiKey: env.deepseekApiKey,
  timeoutMs: env.aiRequestTimeoutMs,
});
