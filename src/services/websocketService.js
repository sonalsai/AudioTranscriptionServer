const WebSocket = require("ws");
const config = require("../config/config");
const logger = require("../utils/logger");

// Track active connections for monitoring
let connectionCounter = 0;

/**
 * Initialize WebSocket Server
 * @param {http.Server} server - HTTP server instance
 * @returns {WebSocket.Server} WebSocket server instance
 */
function initializeWebSocketServer(server) {
  const wss = new WebSocket.Server({ server });

  wss.on("connection", handleConnection);
  wss.on("error", handleServerError);

  return wss;
}

/**
 * Handle new WebSocket connection
 * @param {WebSocket} ws - Client WebSocket connection
 * @param {http.IncomingMessage} req - HTTP request object
 */
function handleConnection(ws, req) {
  const connectionId = ++connectionCounter;
  const clientIp = req.socket.remoteAddress;

  logger.info(
    {
      event: "client_connected",
      connectionId,
      clientIp,
      totalConnections: this.clients.size,
    },
    "Client WebSocket connected"
  );

  // Create Deepgram WebSocket connection
  const deepgramWS = createDeepgramConnection(connectionId);

  setupDeepgramHandlers(deepgramWS, ws, connectionId);
  setupClientHandlers(ws, deepgramWS, connectionId, this);
}

/**
 * Create Deepgram WebSocket connection
 * @param {number} connectionId - Unique connection identifier
 * @returns {WebSocket} Deepgram WebSocket connection
 */
function createDeepgramConnection(connectionId) {
  const deepgramWS = new WebSocket(config.deepgramUrl, {
    headers: {
      Authorization: `Token ${config.deepgramApiKey}`,
    },
  });

  deepgramWS.connectionId = connectionId;
  deepgramWS.ready = false;
  deepgramWS.startTime = Date.now();

  return deepgramWS;
}

/**
 * Setup Deepgram WebSocket event handlers
 * @param {WebSocket} deepgramWS - Deepgram WebSocket connection
 * @param {WebSocket} clientWS - Client WebSocket connection
 * @param {number} connectionId - Unique connection identifier
 */
function setupDeepgramHandlers(deepgramWS, clientWS, connectionId) {
  deepgramWS.on("open", () => {
    const connectionTime = Date.now() - deepgramWS.startTime;
    deepgramWS.ready = true;

    logger.info(
      {
        event: "deepgram_connected",
        connectionId,
        connectionTimeMs: connectionTime,
      },
      "Connected to Deepgram WebSocket"
    );

    // Notify client that the system is ready
    if (clientWS.readyState === WebSocket.OPEN) {
      clientWS.send(JSON.stringify({ type: "ready" }));
      logger.debug(
        {
          event: "ready_signal_sent",
          connectionId,
        },
        "Ready signal sent to client"
      );
    }
  });

  deepgramWS.on("message", (message) => {
    try {
      const data = JSON.parse(message.toString());

      logger.debug(
        {
          event: "deepgram_message_received",
          connectionId,
          messageType: data.type,
          hasTranscript: !!data.channel?.alternatives?.[0]?.transcript,
        },
        "Received message from Deepgram"
      );

      if (clientWS.readyState === WebSocket.OPEN) {
        clientWS.send(JSON.stringify(data));
      } else {
        logger.warn(
          {
            event: "client_not_ready",
            connectionId,
            clientState: clientWS.readyState,
          },
          "Client WebSocket not open, cannot forward Deepgram message"
        );
      }
    } catch (err) {
      logger.error(
        {
          event: "deepgram_parse_error",
          connectionId,
          error: err.message,
          stack: err.stack,
        },
        "Failed to parse Deepgram message"
      );
    }
  });

  deepgramWS.on("error", (err) => {
    logger.error(
      {
        event: "deepgram_error",
        connectionId,
        error: err.message,
        code: err.code,
        stack: err.stack,
      },
      "Deepgram WebSocket error occurred"
    );
  });

  deepgramWS.on("close", (code, reason) => {
    logger.info(
      {
        event: "deepgram_closed",
        connectionId,
        code,
        reason: reason.toString(),
      },
      "Deepgram WebSocket connection closed"
    );
  });
}

/**
 * Setup Client WebSocket event handlers
 * @param {WebSocket} clientWS - Client WebSocket connection
 * @param {WebSocket} deepgramWS - Deepgram WebSocket connection
 * @param {number} connectionId - Unique connection identifier
 * @param {WebSocket.Server} wss - WebSocket server instance
 */
function setupClientHandlers(clientWS, deepgramWS, connectionId, wss) {
  clientWS.on("message", (msg) => {
    if (deepgramWS.ready && deepgramWS.readyState === WebSocket.OPEN) {
      deepgramWS.send(msg);

      logger.debug(
        {
          event: "audio_forwarded",
          connectionId,
          bytesReceived: msg.length,
        },
        "Audio data forwarded to Deepgram"
      );
    } else {
      logger.warn(
        {
          event: "deepgram_not_ready",
          connectionId,
          deepgramReady: deepgramWS.ready,
          deepgramState: deepgramWS.readyState,
        },
        "Deepgram not ready, dropping audio message"
      );
    }
  });

  clientWS.on("close", (code, reason) => {
    logger.info(
      {
        event: "client_disconnected",
        connectionId,
        code,
        reason: reason.toString(),
        totalConnections: wss.clients.size - 1,
      },
      "Client WebSocket disconnected"
    );

    // Clean up Deepgram connection
    if (
      deepgramWS.readyState === WebSocket.OPEN ||
      deepgramWS.readyState === WebSocket.CONNECTING
    ) {
      deepgramWS.close();
      logger.debug(
        {
          event: "deepgram_cleanup",
          connectionId,
        },
        "Deepgram connection closed due to client disconnect"
      );
    }
  });

  clientWS.on("error", (err) => {
    logger.error(
      {
        event: "client_error",
        connectionId,
        error: err.message,
        code: err.code,
        stack: err.stack,
      },
      "Client WebSocket error occurred"
    );
  });
}

/**
 * Handle WebSocket Server errors
 * @param {Error} err - Error object
 */
function handleServerError(err) {
  logger.error(
    {
      event: "wss_error",
      error: err.message,
      stack: err.stack,
    },
    "WebSocket Server error occurred"
  );
}

module.exports = {
  initializeWebSocketServer,
};
