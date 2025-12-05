const pino = require("pino");

/**
 * Production-Ready Pino Logger Configuration
 * 
 * This configuration is optimized for production environments:
 * - No pretty printing (better performance)
 * - JSON output (for log aggregation)
 * - Appropriate log levels
 * - Redaction of sensitive data
 */

const isProduction = process.env.NODE_ENV === "production";

const logger = pino({
    level: process.env.LOG_LEVEL || (isProduction ? "info" : "debug"),

    // Only use pretty printing in development
    ...(isProduction
        ? {}
        : {
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

    // Redact sensitive information in production
    redact: {
        paths: [
            "req.headers.authorization",
            "req.headers.cookie",
            "deepgramApiKey",
            "*.password",
            "*.token",
            "*.apiKey",
        ],
        remove: true,
    },

    // Add base fields to all logs
    base: {
        env: process.env.NODE_ENV || "development",
        service: "audio-transcription-server",
    },

    // Serialize errors properly
    serializers: {
        err: pino.stdSerializers.err,
        req: pino.stdSerializers.req,
        res: pino.stdSerializers.res,
    },
});

module.exports = logger;
