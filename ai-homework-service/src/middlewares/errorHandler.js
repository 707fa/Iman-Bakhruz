const multer = require("multer");
const { AppError } = require("../utils/errors");
const { logger } = require("../utils/logger");

function errorHandler(error, req, res, _next) {
  let normalized = error;

  if (error instanceof multer.MulterError) {
    normalized = new AppError(error.message, {
      statusCode: 400,
      code: "UPLOAD_ERROR",
      details: { field: error.field },
    });
  }

  if (!(normalized instanceof AppError)) {
    normalized = new AppError("Internal server error", {
      statusCode: 500,
      code: "INTERNAL_ERROR",
      expose: false,
    });
  }

  logger.error("request.error", {
    requestId: req.requestId,
    code: normalized.code,
    statusCode: normalized.statusCode,
    message: normalized.message,
    details: normalized.details,
  });

  const payload = {
    success: false,
    error: {
      code: normalized.code,
      message: normalized.expose ? normalized.message : "Internal server error",
    },
  };

  if (normalized.expose && normalized.details) {
    payload.error.details = normalized.details;
  }

  res.status(normalized.statusCode).json(payload);
}

module.exports = {
  errorHandler,
};
