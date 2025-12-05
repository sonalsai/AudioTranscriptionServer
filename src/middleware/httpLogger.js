const pinoHttp = require("pino-http");
const logger = require("../utils/logger");

/**
 * HTTP Request Logging Middleware
 * Provides structured logging for all HTTP requests
 */
const httpLogger = pinoHttp({
  logger,
  customLogLevel: (req, res, err) => {
    if (res.statusCode >= 400 && res.statusCode < 500) {
      return "warn";
    } else if (res.statusCode >= 500 || err) {
      return "error";
    }
    return "info";
  },
  customSuccessMessage: (req, res) => {
    return `${req.method} ${req.url} completed`;
  },
  customErrorMessage: (req, res, err) => {
    return `${req.method} ${req.url} failed - ${err.message}`;
  },
});

module.exports = httpLogger;
