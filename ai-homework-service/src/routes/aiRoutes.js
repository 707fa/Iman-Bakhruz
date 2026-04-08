const express = require("express");
const { checkHomework } = require("../controllers/aiController");
const { userKeyMiddleware } = require("../middlewares/userKey");
const { rateLimitMiddleware } = require("../middlewares/rateLimit");
const { uploadImage } = require("../middlewares/upload");

const router = express.Router();

router.post("/check", userKeyMiddleware, rateLimitMiddleware, uploadImage, checkHomework);

module.exports = router;
