const { env } = require("../config/env");
const { enqueue } = require("../config/queue");
const { getCachedResult, setCachedResult } = require("./cacheService");
const { analyzeWithFallback } = require("./fallbackManager");
const { buildCacheKeyFromText } = require("../utils/hash");
const { logger } = require("../utils/logger");

function trimText(value) {
  return String(value || "").trim();
}

function clampScore(value, fallback = 0) {
  const num = Number(value);
  if (!Number.isFinite(num)) return fallback;
  if (num < 0) return 0;
  if (num > 100) return 100;
  return Math.round(num);
}

function buildSpeakingPrompt({ question, transcript, level, language }) {
  const strictJsonSpec = `{
  "score": number,
  "grammarScore": number,
  "fluencyScore": number,
  "vocabularyScore": number,
  "transcript": "string",
  "correctedAnswer": "string",
  "mistakes": [
    {
      "original": "string",
      "corrected": "string",
      "reason": "string"
    }
  ],
  "feedback": "string",
  "modelAnswer": "string",
  "levelEstimate": "string"
}`;

  return [
    "You are an English speaking evaluator for students.",
    "Evaluate only by transcript text (no audio confidence).",
    "Return STRICT JSON only. No markdown fences. No extra text before or after JSON.",
    "Use scores from 0 to 100.",
    "Feedback must be short, practical, and student-friendly.",
    "If there are no mistakes, return an empty mistakes array.",
    "JSON schema:",
    strictJsonSpec,
    "",
    `Student level hint: ${trimText(level) || "unknown"}`,
    `Preferred feedback language: ${trimText(language) || "en"}`,
    `Question: ${question}`,
    `Student transcript: ${transcript}`,
  ].join("\n");
}

function extractJsonCandidate(raw) {
  const text = trimText(raw);
  if (!text) return null;

  try {
    return JSON.parse(text);
  } catch {
    // continue
  }

  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced && fenced[1]) {
    try {
      return JSON.parse(fenced[1].trim());
    } catch {
      // continue
    }
  }

  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start >= 0 && end > start) {
    const candidate = text.slice(start, end + 1);
    try {
      return JSON.parse(candidate);
    } catch {
      return null;
    }
  }

  return null;
}

function normalizeMistakes(raw) {
  if (!Array.isArray(raw)) return [];

  return raw
    .map((item) => {
      if (!item || typeof item !== "object" || Array.isArray(item)) return null;
      const original = trimText(item.original);
      const corrected = trimText(item.corrected);
      const reason = trimText(item.reason);
      if (!original && !corrected && !reason) return null;
      return { original, corrected, reason };
    })
    .filter((item) => item !== null);
}

function normalizeSpeakingResult(raw, transcriptFallback) {
  const source = raw && typeof raw === "object" && !Array.isArray(raw) ? raw : {};

  return {
    score: clampScore(source.score, 0),
    grammarScore: clampScore(source.grammarScore, 0),
    fluencyScore: clampScore(source.fluencyScore, 0),
    vocabularyScore: clampScore(source.vocabularyScore, 0),
    transcript: trimText(source.transcript) || transcriptFallback,
    correctedAnswer: trimText(source.correctedAnswer),
    mistakes: normalizeMistakes(source.mistakes),
    feedback: trimText(source.feedback),
    modelAnswer: trimText(source.modelAnswer),
    levelEstimate: trimText(source.levelEstimate),
  };
}

function fallbackSpeakingResult(rawText, transcript) {
  const note = trimText(rawText).slice(0, 900);
  return {
    score: 0,
    grammarScore: 0,
    fluencyScore: 0,
    vocabularyScore: 0,
    transcript,
    correctedAnswer: "",
    mistakes: [],
    feedback: note || "Unable to parse structured AI output. Please retry.",
    modelAnswer: "",
    levelEstimate: "",
  };
}

function buildCacheKey(payload) {
  const combined = [
    "speaking",
    trimText(payload.question).toLowerCase(),
    trimText(payload.transcript).toLowerCase(),
    trimText(payload.level).toLowerCase(),
    trimText(payload.language).toLowerCase(),
  ].join("|");
  return buildCacheKeyFromText(env.redisPrefix, combined);
}

function normalizeTeacherQuestions(raw) {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((item) => trimText(item))
    .filter(Boolean)
    .slice(0, 20);
}

function buildSpeakingQuestionsPrompt({ level, language, lessonTopic, teacherQuestions }) {
  const teacherBlock = teacherQuestions.length
    ? teacherQuestions.map((item, index) => `${index + 1}. ${item}`).join("\n")
    : "No teacher-provided mandatory questions.";

  return [
    "You generate English speaking practice questions for students.",
    "Return STRICT JSON only. No markdown fences. No extra text.",
    "Output schema:",
    "{",
    '  "questions": [',
    '    { "id": "q-1", "topic": "string", "prompt": "string" }',
    "  ]",
    "}",
    "Rules:",
    "- Generate exactly 20 questions.",
    "- Match question difficulty to level hint.",
    "- Focus on the lesson topic.",
    "- Keep each prompt clear and classroom-ready.",
    "- No duplicate prompts.",
    "- If teacher questions are provided, include them first (rephrased only if needed for clarity).",
    "",
    `Level hint: ${trimText(level) || "unknown"}`,
    `Preferred output language hint: ${trimText(language) || "en"}`,
    `Lesson topic: ${trimText(lessonTopic) || "General English"}`,
    "Teacher required questions:",
    teacherBlock,
  ].join("\n");
}

function normalizeGeneratedQuestions(raw, fallbackTopic) {
  const root = raw && typeof raw === "object" && !Array.isArray(raw) ? raw : {};
  const list = Array.isArray(root.questions) ? root.questions : [];
  const seen = new Set();
  const normalized = [];

  for (const item of list) {
    if (!item || typeof item !== "object" || Array.isArray(item)) continue;
    const prompt = trimText(item.prompt);
    if (!prompt) continue;
    const key = prompt.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    normalized.push({
      id: trimText(item.id) || `q-${normalized.length + 1}`,
      topic: trimText(item.topic) || fallbackTopic || "General",
      prompt,
    });
    if (normalized.length >= 20) break;
  }

  return normalized;
}

function buildGenerationCacheKey(payload) {
  const teacherQuestions = normalizeTeacherQuestions(payload.teacherQuestions);
  const combined = [
    "speaking_questions",
    trimText(payload.level).toLowerCase(),
    trimText(payload.language).toLowerCase(),
    trimText(payload.lessonTopic).toLowerCase(),
    teacherQuestions.join("|").toLowerCase(),
  ].join("|");
  return buildCacheKeyFromText(env.redisPrefix, combined);
}

async function analyzeSpeaking(payload, context) {
  const cacheKey = buildCacheKey(payload);
  const cached = await getCachedResult(cacheKey);

  if (cached && cached.data && typeof cached.data === "object") {
    logger.info("speaking.cache.hit", {
      requestId: context.requestId,
      userKey: context.userKey,
    });

    return {
      success: true,
      provider: "cache",
      cached: true,
      data: normalizeSpeakingResult(cached.data, payload.transcript),
    };
  }

  logger.info("speaking.cache.miss", {
    requestId: context.requestId,
    userKey: context.userKey,
  });

  const prompt = buildSpeakingPrompt(payload);
  const output = await enqueue(
    () =>
      analyzeWithFallback(
        {
          text: prompt,
          imageBuffer: null,
          mimeType: null,
        },
        context,
      ),
    {
      requestId: context.requestId,
      userKey: context.userKey,
    },
  );

  const parsed = extractJsonCandidate(output.result);
  const normalized = parsed
    ? normalizeSpeakingResult(parsed, payload.transcript)
    : fallbackSpeakingResult(output.result, payload.transcript);

  await setCachedResult(
    cacheKey,
    {
      data: normalized,
      provider: output.provider,
      createdAt: new Date().toISOString(),
    },
    env.cacheTtlSeconds,
  );

  return {
    success: true,
    provider: output.provider,
    cached: false,
    data: normalized,
  };
}

async function generateSpeakingQuestions(payload, context) {
  const teacherQuestions = normalizeTeacherQuestions(payload.teacherQuestions);
  const lessonTopic = trimText(payload.lessonTopic) || "General English";
  const cacheKey = buildGenerationCacheKey({
    level: payload.level,
    language: payload.language,
    lessonTopic,
    teacherQuestions,
  });

  const cached = await getCachedResult(cacheKey);
  if (cached && cached.data && typeof cached.data === "object" && Array.isArray(cached.data.questions)) {
    logger.info("speaking.questions.cache.hit", {
      requestId: context.requestId,
      userKey: context.userKey,
    });
    return {
      success: true,
      provider: "cache",
      cached: true,
      data: { questions: cached.data.questions.slice(0, 20) },
    };
  }

  logger.info("speaking.questions.cache.miss", {
    requestId: context.requestId,
    userKey: context.userKey,
  });

  const prompt = buildSpeakingQuestionsPrompt({
    level: payload.level,
    language: payload.language,
    lessonTopic,
    teacherQuestions,
  });

  const output = await enqueue(
    () =>
      analyzeWithFallback(
        {
          text: prompt,
          imageBuffer: null,
          mimeType: null,
        },
        context,
      ),
    {
      requestId: context.requestId,
      userKey: context.userKey,
    },
  );

  const parsed = extractJsonCandidate(output.result);
  const generated = normalizeGeneratedQuestions(parsed, lessonTopic);
  const merged = [];
  const seen = new Set();

  for (const teacherPrompt of teacherQuestions) {
    const key = teacherPrompt.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    merged.push({
      id: `t-${merged.length + 1}`,
      topic: lessonTopic,
      prompt: teacherPrompt,
    });
  }

  for (const item of generated) {
    const key = item.prompt.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    merged.push({
      id: item.id || `q-${merged.length + 1}`,
      topic: item.topic || lessonTopic,
      prompt: item.prompt,
    });
    if (merged.length >= 20) break;
  }

  while (merged.length < 20) {
    const nextIndex = merged.length + 1;
    merged.push({
      id: `f-${nextIndex}`,
      topic: lessonTopic,
      prompt: `Speak for 30-45 seconds about "${lessonTopic}" and give practical examples. (${nextIndex})`,
    });
  }

  const result = {
    questions: merged.slice(0, 20),
  };

  await setCachedResult(
    cacheKey,
    {
      data: result,
      provider: output.provider,
      createdAt: new Date().toISOString(),
    },
    env.cacheTtlSeconds,
  );

  return {
    success: true,
    provider: output.provider,
    cached: false,
    data: result,
  };
}

module.exports = {
  analyzeSpeaking,
  generateSpeakingQuestions,
};
