const express = require("express");
const cors = require("cors");
const routes = require("./routes");
const { env } = require("./config/env");
const { healthCheck } = require("./controllers/healthController");
const { requestLogger } = require("./middlewares/requestLogger");
const { notFound } = require("./middlewares/notFound");
const { errorHandler } = require("./middlewares/errorHandler");

const app = express();

app.disable("x-powered-by");
app.set("trust proxy", true);

const corsOriginMatcher = (origin, callback) => {
  if (!origin) {
    callback(null, true);
    return;
  }

  const normalizedOrigin = String(origin).replace(/\/+$/, "");
  if (env.corsAllowedOrigins.includes(normalizedOrigin)) {
    callback(null, true);
    return;
  }

  callback(new Error("Not allowed by CORS"));
};

app.use(
  cors({
    origin: corsOriginMatcher,
    methods: ["GET", "POST", "OPTIONS"],
    allowedHeaders: ["Content-Type", "x-user-id", "Authorization"],
    credentials: false,
  }),
);
app.use(requestLogger);
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true }));

app.get("/health", healthCheck);
app.use(routes);
app.use(notFound);
app.use(errorHandler);

module.exports = app;
