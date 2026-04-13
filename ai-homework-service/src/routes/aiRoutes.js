const express = require("express");
const { checkHomework, chat, homeworkCheck, speakingCheck } = require("../controllers/aiController");
const { userKeyMiddleware } = require("../middlewares/userKey");
const { rateLimitMiddleware } = require("../middlewares/rateLimit");
const { uploadImage } = require("../middlewares/upload");

const router = express.Router();
const guardBase = [userKeyMiddleware, rateLimitMiddleware];
const guardWithUpload = [...guardBase, uploadImage];

router.post("/check", ...guardWithUpload, checkHomework);
router.post("/chat", ...guardWithUpload, chat);
router.post("/homework-check", ...guardWithUpload, homeworkCheck);
router.post("/speaking/check", ...guardBase, speakingCheck);

module.exports = router;
