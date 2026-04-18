const { env } = require("../config/env");
const { ProviderError } = require("../utils/errors");
const {
  createHttpClient,
  throwProviderHttpError,
  throwProviderNetworkError,
} = require("../utils/providerHttp");

const client = createHttpClient("https://generativelanguage.googleapis.com", env.aiRequestTimeoutMs);

const SYSTEM_PROMPT =
  "You are an English homework checker. Return concise, practical feedback in plain text.";

function extractGeminiText(data) {
  const candidates = data?.candidates;
  if (!Array.isArray(candidates) || !candidates.length) return "";

  const parts = candidates[0]?.content?.parts;
  if (!Array.isArray(parts)) return "";

  return parts
    .map((part) => (typeof part?.text === "string" ? part.text : ""))
    .filter(Boolean)
    .join("\n")
    .trim();
}

function endpoint() {
  return `/v1beta/models/${encodeURIComponent(env.geminiModel)}:generateContent`;
}

async function requestGemini(parts) {
  try {
    const response = await client.post(endpoint(), {
      contents: [{ role: "user", parts }],
      generationConfig: {
        temperature: 0.2,
      },
    }, {
      headers: {
        "x-goog-api-key": env.geminiApiKey,
        "Content-Type": "application/json",
      },
    });

    if (response.status < 200 || response.status >= 300) {
      throwProviderHttpError({
        provider: "gemini",
        status: response.status,
        data: response.data,
      });
    }

    const text = extractGeminiText(response.data);
    if (!text) {
      throw new ProviderError("Gemini returned empty response", {
        provider: "gemini",
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
        provider: "gemini",
        status: error.response.status,
        data: error.response.data,
      });
    }
    throwProviderNetworkError({ provider: "gemini", error });
  }
}

async function analyzeText({ text }) {
  const prompt = `${SYSTEM_PROMPT}\n\nStudent text:\n${String(text || "").trim()}`;
  return requestGemini([{ text: prompt }]);
}

async function analyzeImage({ imageBuffer, mimeType, text }) {
  const imageBase64 = Buffer.from(imageBuffer).toString("base64");
  const prompt = `${SYSTEM_PROMPT}\n\nThe student sent homework image.${text ? `\nExtra note: ${text}` : ""}`;

  return requestGemini([
    { text: prompt },
    {
      inlineData: {
        mimeType,
        data: imageBase64,
      },
    },
  ]);
}

module.exports = {
  name: "gemini",
  analyzeText,
  analyzeImage,
};
