const { ProviderError } = require("../utils/errors");
const {
  createHttpClient,
  extractTextFromOpenAIStyle,
  throwProviderHttpError,
  throwProviderNetworkError,
} = require("../utils/providerHttp");

const SYSTEM_PROMPT =
  "You are an English homework checker. Return concise, practical feedback in plain text.";

function createOpenAIStyleProvider(config) {
  const {
    name,
    baseUrl,
    model,
    apiKey,
    timeoutMs,
    extraHeaders = {},
  } = config;

  const client = createHttpClient(baseUrl, timeoutMs);

  function extractText(data) {
    const content = data?.choices?.[0]?.message?.content;
    return extractTextFromOpenAIStyle(content);
  }

  async function requestCompletion(messages) {
    try {
      const response = await client.post(
        "/chat/completions",
        {
          model,
          temperature: 0.2,
          messages,
        },
        {
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
            ...extraHeaders,
          },
        }
      );

      if (response.status < 200 || response.status >= 300) {
        throwProviderHttpError({
          provider: name,
          status: response.status,
          data: response.data,
        });
      }

      const text = extractText(response.data);
      if (!text) {
        throw new ProviderError(`${name} returned empty response`, {
          provider: name,
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
          provider: name,
          status: error.response.status,
          data: error.response.data,
        });
      }
      throwProviderNetworkError({ provider: name, error });
    }
  }

  async function analyzeText({ text }) {
    return requestCompletion([
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: String(text || "").trim() },
    ]);
  }

  async function analyzeImage({ imageBuffer, mimeType, text }) {
    const imageBase64 = Buffer.from(imageBuffer).toString("base64");
    const dataUrl = `data:${mimeType};base64,${imageBase64}`;

    return requestCompletion([
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

  return {
    name,
    analyzeText,
    analyzeImage,
  };
}

module.exports = { createOpenAIStyleProvider, SYSTEM_PROMPT };
