const express = require("express");
const routes = require("./routes");
const { requestLogger } = require("./middlewares/requestLogger");
const { notFound } = require("./middlewares/notFound");
const { errorHandler } = require("./middlewares/errorHandler");

const app = express();

app.disable("x-powered-by");
app.set("trust proxy", true);

app.use(requestLogger);
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true }));

app.use(routes);
app.use(notFound);
app.use(errorHandler);

module.exports = app;
