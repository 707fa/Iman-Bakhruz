const express = require("express");
const { checkHomework, chat, homeworkCheck } = require("../controllers/aiController");
const { userKeyMiddleware } = require("../middlewares/userKey");
const { rateLimitMiddleware } = require("../middlewares/rateLimit");
const { uploadImage } = require("../middlewares/upload");

const router = express.Router();
const guard = [userKeyMiddleware, rateLimitMiddleware, uploadImage];

router.post("/check", ...guard, checkHomework);
router.post("/chat", ...guard, chat);
router.post("/homework-check", ...guard, homeworkCheck);

module.exports = router;
