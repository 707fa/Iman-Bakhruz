const { analyzeHomework } = require("../services/aiCheckService");
const { analyzeSpeaking } = require("../services/speakingService");
const { AppError } = require("../utils/errors");
const { ok } = require("../utils/response");

function normalizeText(raw) {
  const text = String(raw || "").trim();
  return text.length ? text : "";
}

async function runAiCheck(req, res, next) {
  try {
    const text = normalizeText(req.body?.text);
    const imageBuffer = req.file?.buffer || null;
    const mimeType = req.file?.mimetype || null;

    if (!text && !imageBuffer) {
      throw new AppError("Provide text or image", {
        statusCode: 400,
        code: "INPUT_REQUIRED",
      });
    }

    const result = await analyzeHomework(
      {
        text,
        imageBuffer,
        mimeType,
      },
      {
        requestId: req.requestId,
        userKey: req.userIdentity?.key,
      },
    );

    return ok(res, result);
  } catch (error) {
    return next(error);
  }
}

async function checkHomework(req, res, next) {
  return runAiCheck(req, res, next);
}

async function chat(req, res, next) {
  return runAiCheck(req, res, next);
}

async function homeworkCheck(req, res, next) {
  return runAiCheck(req, res, next);
}

async function speakingCheck(req, res, next) {
  try {
    const question = normalizeText(req.body?.question);
    const transcript = normalizeText(req.body?.transcript);
    const level = normalizeText(req.body?.level);
    const language = normalizeText(req.body?.language);

    if (!question) {
      throw new AppError("Question is required", {
        statusCode: 400,
        code: "SPEAKING_QUESTION_REQUIRED",
      });
    }

    if (!transcript) {
      throw new AppError("Transcript is required", {
        statusCode: 400,
        code: "SPEAKING_TRANSCRIPT_REQUIRED",
      });
    }

    const result = await analyzeSpeaking(
      {
        question,
        transcript,
        level,
        language,
      },
      {
        requestId: req.requestId,
        userKey: req.userIdentity?.key,
      },
    );

    return ok(res, result);
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  checkHomework,
  chat,
  homeworkCheck,
  speakingCheck,
};
