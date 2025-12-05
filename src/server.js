const http = require("http");
const createApp = require("./app");
const config = require("./config/config");
const logger = require("./utils/logger");
const { initializeWebSocketServer } = require("./services/websocketService");
const {
  setupGracefulShutdown,
  setupErrorHandlers,
} = require("./utils/processHandlers");

/**
 * Initialize and start the server
 */
function startServer() {
  // Create Express app
  const app = createApp();

  // Create HTTP server
  const server = http.createServer(app);

  // Initialize WebSocket server
  initializeWebSocketServer(server);

  // Setup process handlers
  setupGracefulShutdown(server);
  setupErrorHandlers();

  // Start listening
  server.listen(config.port, () => {
    logger.info(
      {
        event: "server_started",
        port: config.port,
        protocol: config.protocol,
        domain: config.domain,
        httpUrl: `${config.protocol}://${config.domain}:${config.port}`,
        wsUrl: `${config.protocol === "https" ? "wss" : "ws"}://${
          config.domain
        }:${config.port}`,
      },
      "AudioTranscription Server started successfully"
    );
  });

  return server;
}

// Start the server if this file is run directly
if (require.main === module) {
  startServer();
}

module.exports = startServer;
