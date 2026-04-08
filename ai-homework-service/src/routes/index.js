const express = require("express");
const aiRoutes = require("./aiRoutes");
const healthRoutes = require("./healthRoutes");

const router = express.Router();

router.use("/api", healthRoutes);
router.use("/api/ai", aiRoutes);

module.exports = router;
