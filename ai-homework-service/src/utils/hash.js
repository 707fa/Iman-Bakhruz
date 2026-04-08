const crypto = require("crypto");

function sha256(input) {
  return crypto.createHash("sha256").update(input).digest("hex");
}

function normalizeText(text) {
  return String(text || "")
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase();
}

function hashText(text) {
  const normalized = normalizeText(text);
  return sha256(normalized);
}

function hashImageBuffer(buffer) {
  return sha256(buffer);
}

function buildCacheKeyFromText(prefix, text) {
  return `${prefix}:cache:text:${hashText(text)}`;
}

function buildCacheKeyFromImage(prefix, imageBuffer, extra = "") {
  const imgHash = hashImageBuffer(imageBuffer);
  const extraPart = extra ? sha256(String(extra)) : "none";
  return `${prefix}:cache:image:${imgHash}:${extraPart}`;
}

module.exports = {
  normalizeText,
  hashText,
  hashImageBuffer,
  buildCacheKeyFromText,
  buildCacheKeyFromImage,
};
