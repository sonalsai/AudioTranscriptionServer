const WebSocket = require("ws");
const config = require("../config/config");
const logger = require("../utils/logger");

// Configuration from config file
const INACTIVITY_TIMEOUT = config.ws.inactivityTimeout;
const HEARTBEAT_INTERVAL = config.ws.heartbeatInterval;

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

  // Setup heartbeat interval
  const heartbeatInterval = setInterval(() => {
    wss.clients.forEach((ws) => {
      if (ws.isAlive === false) {
        logger.warn(
          {
            event: "client_timeout",
            connectionId: ws.connectionId,
          },
          "Client failed heartbeat, terminating"
        );
        return ws.terminate();
      }
      ws.isAlive = false;
      ws.ping();
    });
  }, HEARTBEAT_INTERVAL);

  wss.on("close", () => {
    clearInterval(heartbeatInterval);
  });

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

  // Initialize connection metadata
  ws.connectionId = connectionId;
  ws.isAlive = true;
  ws.lastActivity = Date.now();

  logger.info(
    {
      event: "client_connected",
      connectionId,
      clientIp,
      totalConnections: this.clients.size,
    },
    "Client WebSocket connected"
  );

  try {
    // Create Deepgram WebSocket connection
    const deepgramWS = createDeepgramConnection(connectionId);

    // Setup inactivity timeout
    const inactivityTimer = setupInactivityTimeout(
      ws,
      deepgramWS,
      connectionId
    );

    // Store cleanup references
    ws.deepgramWS = deepgramWS;
    ws.inactivityTimer = inactivityTimer;

    setupDeepgramHandlers(deepgramWS, ws, connectionId);
    setupClientHandlers(ws, deepgramWS, connectionId, this);
  } catch (err) {
    logger.error(
      {
        event: "connection_setup_error",
        connectionId,
        error: err.message,
        stack: err.stack,
      },
      "Failed to setup WebSocket connection"
    );

    ws.close(1011, "Internal server error");
  }
}

/**
 * Setup inactivity timeout for WebSocket connection
 * @param {WebSocket} clientWS - Client WebSocket
 * @param {WebSocket} deepgramWS - Deepgram WebSocket
 * @param {number} connectionId - Connection identifier
 * @returns {NodeJS.Timeout} Timeout reference
 */
function setupInactivityTimeout(clientWS, deepgramWS, connectionId) {
  return setTimeout(() => {
    logger.warn(
      {
        event: "inactivity_timeout",
        connectionId,
        timeout: INACTIVITY_TIMEOUT,
      },
      "Connection inactive, closing"
    );

    cleanupConnection(clientWS, deepgramWS, connectionId);
    clientWS.close(1000, "Inactivity timeout");
  }, INACTIVITY_TIMEOUT);
}

/**
 * Reset inactivity timeout
 * @param {WebSocket} ws - Client WebSocket
 */
function resetInactivityTimeout(ws) {
  ws.lastActivity = Date.now();
  if (ws.inactivityTimer) {
    clearTimeout(ws.inactivityTimer);
    ws.inactivityTimer = setupInactivityTimeout(
      ws,
      ws.deepgramWS,
      ws.connectionId
    );
  }
}

/**
 * Create Deepgram WebSocket connection
 * @param {number} connectionId - Unique connection identifier
 * @returns {WebSocket} Deepgram WebSocket connection
 */
function createDeepgramConnection(connectionId) {
  try {
    const deepgramWS = new WebSocket(config.deepgramUrl, {
      headers: {
        Authorization: `Token ${config.deepgramApiKey}`,
      },
    });

    deepgramWS.connectionId = connectionId;
    deepgramWS.ready = false;
    deepgramWS.startTime = Date.now();

    return deepgramWS;
  } catch (err) {
    logger.error(
      {
        event: "deepgram_connection_error",
        connectionId,
        error: err.message,
        stack: err.stack,
      },
      "Failed to create Deepgram connection"
    );
    throw err;
  }
}

/**
 * Setup Deepgram WebSocket event handlers
 * @param {WebSocket} deepgramWS - Deepgram WebSocket connection
 * @param {WebSocket} clientWS - Client WebSocket connection
 * @param {number} connectionId - Unique connection identifier
 */
function setupDeepgramHandlers(deepgramWS, clientWS, connectionId) {
  deepgramWS.on("open", () => {
    try {
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
    } catch (err) {
      logger.error(
        {
          event: "deepgram_open_error",
          connectionId,
          error: err.message,
          stack: err.stack,
        },
        "Error in Deepgram open handler"
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
          event: "deepgram_message_error",
          connectionId,
          error: err.message,
          stack: err.stack,
        },
        "Error processing Deepgram message"
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

    // Cleanup on error
    try {
      cleanupConnection(clientWS, deepgramWS, connectionId);
      if (clientWS.readyState === WebSocket.OPEN) {
        clientWS.close(1011, "Deepgram connection error");
      }
    } catch (cleanupErr) {
      logger.error(
        {
          event: "cleanup_error",
          connectionId,
          error: cleanupErr.message,
        },
        "Error during Deepgram error cleanup"
      );
    }
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

    // Ensure client is notified
    try {
      if (clientWS.readyState === WebSocket.OPEN) {
        clientWS.send(
          JSON.stringify({
            type: "error",
            message: "Deepgram connection closed",
          })
        );
      }
    } catch (err) {
      logger.error(
        {
          event: "client_notify_error",
          connectionId,
          error: err.message,
        },
        "Failed to notify client of Deepgram closure"
      );
    }
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
  // Heartbeat/pong handler
  clientWS.on("pong", () => {
    clientWS.isAlive = true;
  });

  clientWS.on("message", (msg) => {
    try {
      // Reset inactivity timeout
      resetInactivityTimeout(clientWS);

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
    } catch (err) {
      logger.error(
        {
          event: "message_forward_error",
          connectionId,
          error: err.message,
          stack: err.stack,
        },
        "Error forwarding message to Deepgram"
      );
    }
  });

  clientWS.on("close", (code, reason) => {
    try {
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

      // Clean up all resources
      cleanupConnection(clientWS, deepgramWS, connectionId);
    } catch (err) {
      logger.error(
        {
          event: "close_handler_error",
          connectionId,
          error: err.message,
          stack: err.stack,
        },
        "Error in client close handler"
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

    // Cleanup on error
    try {
      cleanupConnection(clientWS, deepgramWS, connectionId);
    } catch (cleanupErr) {
      logger.error(
        {
          event: "cleanup_error",
          connectionId,
          error: cleanupErr.message,
        },
        "Error during client error cleanup"
      );
    }
  });
}

/**
 * Cleanup WebSocket connection and associated resources
 * @param {WebSocket} clientWS - Client WebSocket
 * @param {WebSocket} deepgramWS - Deepgram WebSocket
 * @param {number} connectionId - Connection identifier
 */
function cleanupConnection(clientWS, deepgramWS, connectionId) {
  try {
    logger.debug(
      {
        event: "cleanup_started",
        connectionId,
      },
      "Starting connection cleanup"
    );

    // Clear inactivity timer
    if (clientWS.inactivityTimer) {
      clearTimeout(clientWS.inactivityTimer);
      clientWS.inactivityTimer = null;
    }

    // Close Deepgram connection
    if (
      deepgramWS &&
      (deepgramWS.readyState === WebSocket.OPEN ||
        deepgramWS.readyState === WebSocket.CONNECTING)
    ) {
      deepgramWS.close();
      logger.debug(
        {
          event: "deepgram_cleanup",
          connectionId,
        },
        "Deepgram connection closed"
      );
    }

    // Remove references
    if (clientWS) {
      clientWS.deepgramWS = null;
    }

    logger.debug(
      {
        event: "cleanup_completed",
        connectionId,
      },
      "Connection cleanup completed"
    );
  } catch (err) {
    logger.error(
      {
        event: "cleanup_error",
        connectionId,
        error: err.message,
        stack: err.stack,
      },
      "Error during connection cleanup"
    );
  }
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
