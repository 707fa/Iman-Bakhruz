const { env } = require("../config/env");
const { ProviderError } = require("../utils/errors");
const {
  createHttpClient,
  extractTextFromOpenAIStyle,
  throwProviderHttpError,
  throwProviderNetworkError,
} = require("../utils/providerHttp");

const client = createHttpClient(env.deepseekBaseUrl, env.aiRequestTimeoutMs);

const SYSTEM_PROMPT =
  "You are an English homework checker. Return concise, practical feedback in plain text.";

function extractDeepseekText(data) {
  const content = data?.choices?.[0]?.message?.content;
  return extractTextFromOpenAIStyle(content);
}

async function requestDeepseek(messages) {
  try {
    const response = await client.post(
      "/chat/completions",
      {
        model: env.deepseekModel,
        temperature: 0.2,
        messages,
      },
      {
        headers: {
          Authorization: `Bearer ${env.deepseekApiKey}`,
          "Content-Type": "application/json",
        },
      }
    );

    if (response.status < 200 || response.status >= 300) {
      throwProviderHttpError({
        provider: "deepseek",
        status: response.status,
        data: response.data,
      });
    }

    const text = extractDeepseekText(response.data);
    if (!text) {
      throw new ProviderError("DeepSeek returned empty response", {
        provider: "deepseek",
        statusCode: 502,
        code: "PROVIDER_EMPTY_RESPONSE",
        retryable: true,
        fallbackAllowed: true,
      });
    }

    return text;
  } catch (error) {
    if (error instanceof ProviderError) throw error;
    if (error.response) {
      throwProviderHttpError({
        provider: "deepseek",
        status: error.response.status,
        data: error.response.data,
      });
    }
    throwProviderNetworkError({ provider: "deepseek", error });
  }
}

async function analyzeText({ text }) {
  return requestDeepseek([
    { role: "system", content: SYSTEM_PROMPT },
    { role: "user", content: String(text || "").trim() },
  ]);
}

async function analyzeImage({ imageBuffer, mimeType, text }) {
  const imageBase64 = Buffer.from(imageBuffer).toString("base64");
  const dataUrl = `data:${mimeType};base64,${imageBase64}`;

  return requestDeepseek([
    { role: "system", content: SYSTEM_PROMPT },
    {
      role: "user",
      content: [
        {
          type: "text",
          text: text
            ? `Check this homework image. Student note: ${text}`
            : "Check this homework image.",
        },
        {
          type: "image_url",
          image_url: {
            url: dataUrl,
          },
        },
      ],
    },
  ]);
}

module.exports = {
  name: "deepseek",
  analyzeText,
  analyzeImage,
};
