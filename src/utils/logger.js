const pino = require("pino");

/**
 * Unified Pino Logger Configuration
 *
 * Automatically configures logger based on environment:
 *
 * DEVELOPMENT:
 * - Pretty printed output with colors
 * - Debug level logging
 * - Human-readable timestamps
 *
 * PRODUCTION:
 * - JSON output (optimized for log aggregation)
 * - Info level logging
 * - Sensitive data redaction
 * - Error serialization
 * - Service metadata
 */

const isProduction = process.env.NODE_ENV === "production";
const isDevelopment = !isProduction;

// Base configuration
const loggerConfig = {
  level: process.env.LOG_LEVEL || (isProduction ? "info" : "debug"),

  // Pretty printing only in development (better performance in production)
  ...(isDevelopment && {
    transport: {
      target: "pino-pretty",
      options: {
        colorize: true,
        translateTime: "SYS:standard",
        ignore: "pid,hostname",
        singleLine: false,
        messageFormat: "{msg}",
      },
    },
  }),

  formatters: {
    level: (label) => {
      return { level: label.toUpperCase() };
    },
  },

  timestamp: pino.stdTimeFunctions.isoTime,

  // Redact sensitive information (always active, but especially important in production)
  redact: {
    paths: [
      "req.headers.authorization",
      "req.headers.cookie",
      "deepgramApiKey",
      "*.password",
      "*.token",
      "*.apiKey",
      "*.secret",
    ],
    remove: true,
  },

  // Add base fields to all logs
  base: {
    env: process.env.NODE_ENV || "development",
    service: "audio-transcription-server",
  },

  // Serialize errors and HTTP objects properly
  serializers: {
    err: pino.stdSerializers.err,
    req: pino.stdSerializers.req,
    res: pino.stdSerializers.res,
  },
};

const logger = pino(loggerConfig);

// Log the logger configuration on startup
logger.info(
  {
    environment: isProduction ? "production" : "development",
    logLevel: loggerConfig.level,
    prettyPrint: isDevelopment,
  },
  "Logger initialized"
);

module.exports = logger;
