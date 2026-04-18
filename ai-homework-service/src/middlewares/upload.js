const multer = require("multer");
const { env } = require("../config/env");
const { AppError } = require("../utils/errors");

const allowedMimeTypes = new Set(["image/jpeg", "image/png", "image/webp"]);

const storage = multer.memoryStorage();

const upload = multer({
  storage,
  limits: {
    fileSize: env.maxImageBytes,
  },
  fileFilter: (_req, file, cb) => {
    if (!allowedMimeTypes.has(file.mimetype)) {
      return cb(
        new AppError("Only image/jpeg, image/png, image/webp are allowed", {
          statusCode: 400,
          code: "INVALID_IMAGE_TYPE",
        })
      );
    }
    cb(null, true);
  },
});

const uploadImage = upload.single("image");

module.exports = {
  uploadImage,
};
