const { analyzeHomework } = require("../services/aiCheckService");
const { AppError } = require("../utils/errors");
const { ok } = require("../utils/response");

function normalizeText(raw) {
  const text = String(raw || "").trim();
  return text.length ? text : "";
}

async function checkHomework(req, res, next) {
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
      }
    );

    return ok(res, result);
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  checkHomework,
};
