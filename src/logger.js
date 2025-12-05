const pino = require("pino");

/**
 * Pino Logger Configuration
 * 
 * This logger provides structured logging for:
 * - HTTP requests
 * - WebSocket connections
 * - Deepgram stream lifecycle
 * - Application errors
 */

const logger = pino({
    level: process.env.LOG_LEVEL || "info",
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
    formatters: {
        level: (label) => {
            return { level: label.toUpperCase() };
        },
    },
    timestamp: pino.stdTimeFunctions.isoTime,
});

module.exports = logger;
