const { AppError } = require("../utils/errors");

function notFound(_req, _res, next) {
  next(
    new AppError("Route not found", {
      statusCode: 404,
      code: "ROUTE_NOT_FOUND",
    })
  );
}

module.exports = {
  notFound,
};
