const logger = require("./logger");

/**
 * Setup graceful shutdown handlers
 * @param {http.Server} server - HTTP server instance
 */
function setupGracefulShutdown(server) {
  process.on("SIGTERM", () => handleShutdown(server, "SIGTERM"));
  process.on("SIGINT", () => handleShutdown(server, "SIGINT"));
}

/**
 * Handle graceful shutdown
 * @param {http.Server} server - HTTP server instance
 * @param {string} signal - Signal name
 */
function handleShutdown(server, signal) {
  logger.info(
    { event: "shutdown_initiated", signal },
    `${signal} received, starting graceful shutdown`
  );

  server.close(() => {
    logger.info({ event: "server_closed" }, "HTTP server closed");
    process.exit(0);
  });
}

/**
 * Setup error handlers for uncaught exceptions and unhandled rejections
 */
function setupErrorHandlers() {
  process.on("uncaughtException", (err) => {
    logger.fatal(
      {
        event: "uncaught_exception",
        error: err.message,
        stack: err.stack,
      },
      "Uncaught exception occurred"
    );
    process.exit(1);
  });

  process.on("unhandledRejection", (reason, promise) => {
    logger.fatal(
      {
        event: "unhandled_rejection",
        reason,
        promise,
      },
      "Unhandled promise rejection"
    );
    process.exit(1);
  });
}

module.exports = {
  setupGracefulShutdown,
  setupErrorHandlers,
};
