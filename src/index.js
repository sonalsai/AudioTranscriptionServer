const express = require("express");
const cors = require("cors");
const http = require("http");
const WebSocket = require("ws");
const pinoHttp = require("pino-http");
const config = require("./config");
const logger = require("./logger");

// Express App
const app = express();

// HTTP Request Logging Middleware
app.use(
  pinoHttp({
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
  })
);

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get("/", (req, res) => {
  req.log.info("Health check endpoint accessed");
  res.send("Server is running!");
});

// HTTP Server
const server = http.createServer(app);

// WebSocket Server
const wss = new WebSocket.Server({ server });

// Track active connections for monitoring
let connectionCounter = 0;

wss.on("connection", (ws, req) => {
  // Generate unique connection ID for tracking
  const connectionId = ++connectionCounter;
  const clientIp = req.socket.remoteAddress;

  logger.info({
    event: "client_connected",
    connectionId,
    clientIp,
    totalConnections: wss.clients.size,
  }, "Client WebSocket connected");

  // Create Deepgram WebSocket connection
  const deepgramWS = new WebSocket(config.deepgramUrl, {
    headers: {
      Authorization: `Token ${config.deepgramApiKey}`,
    },
  });

  let deepgramReady = false;
  const deepgramStartTime = Date.now();

  // Deepgram WebSocket Event Handlers
  deepgramWS.on("open", () => {
    const connectionTime = Date.now() - deepgramStartTime;
    deepgramReady = true;

    logger.info({
      event: "deepgram_connected",
      connectionId,
      connectionTimeMs: connectionTime,
    }, "Connected to Deepgram WebSocket");

    // Notify client that the system is ready
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: "ready" }));
      logger.debug({
        event: "ready_signal_sent",
        connectionId,
      }, "Ready signal sent to client");
    }
  });

  deepgramWS.on("message", (message) => {
    try {
      const data = JSON.parse(message.toString());

      logger.debug({
        event: "deepgram_message_received",
        connectionId,
        messageType: data.type,
        hasTranscript: !!data.channel?.alternatives?.[0]?.transcript,
      }, "Received message from Deepgram");

      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify(data));
      } else {
        logger.warn({
          event: "client_not_ready",
          connectionId,
          clientState: ws.readyState,
        }, "Client WebSocket not open, cannot forward Deepgram message");
      }
    } catch (err) {
      logger.error({
        event: "deepgram_parse_error",
        connectionId,
        error: err.message,
        stack: err.stack,
      }, "Failed to parse Deepgram message");
    }
  });

  deepgramWS.on("error", (err) => {
    logger.error({
      event: "deepgram_error",
      connectionId,
      error: err.message,
      code: err.code,
      stack: err.stack,
    }, "Deepgram WebSocket error occurred");
  });

  deepgramWS.on("close", (code, reason) => {
    logger.info({
      event: "deepgram_closed",
      connectionId,
      code,
      reason: reason.toString(),
    }, "Deepgram WebSocket connection closed");
  });

  // Client WebSocket Event Handlers
  ws.on("message", (msg) => {
    if (deepgramReady && deepgramWS.readyState === WebSocket.OPEN) {
      deepgramWS.send(msg);

      logger.debug({
        event: "audio_forwarded",
        connectionId,
        bytesReceived: msg.length,
      }, "Audio data forwarded to Deepgram");
    } else {
      logger.warn({
        event: "deepgram_not_ready",
        connectionId,
        deepgramReady,
        deepgramState: deepgramWS.readyState,
      }, "Deepgram not ready, dropping audio message");
    }
  });

  ws.on("close", (code, reason) => {
    logger.info({
      event: "client_disconnected",
      connectionId,
      code,
      reason: reason.toString(),
      totalConnections: wss.clients.size - 1,
    }, "Client WebSocket disconnected");

    // Clean up Deepgram connection
    if (deepgramWS.readyState === WebSocket.OPEN || deepgramWS.readyState === WebSocket.CONNECTING) {
      deepgramWS.close();
      logger.debug({
        event: "deepgram_cleanup",
        connectionId,
      }, "Deepgram connection closed due to client disconnect");
    }
  });

  ws.on("error", (err) => {
    logger.error({
      event: "client_error",
      connectionId,
      error: err.message,
      code: err.code,
      stack: err.stack,
    }, "Client WebSocket error occurred");
  });
});

// WebSocket Server Error Handler
wss.on("error", (err) => {
  logger.error({
    event: "wss_error",
    error: err.message,
    stack: err.stack,
  }, "WebSocket Server error occurred");
});

// Start Server
server.listen(config.port, () => {
  logger.info({
    event: "server_started",
    port: config.port,
    protocol: config.protocol,
    domain: config.domain,
    httpUrl: `${config.protocol}://${config.domain}:${config.port}`,
    wsUrl: `${config.protocol === "https" ? "wss" : "ws"}://${config.domain}:${config.port}`,
  }, "AudioTranscription Server started successfully");
});

// Graceful Shutdown Handler
process.on("SIGTERM", () => {
  logger.info({ event: "shutdown_initiated" }, "SIGTERM received, starting graceful shutdown");

  server.close(() => {
    logger.info({ event: "server_closed" }, "HTTP server closed");
    process.exit(0);
  });
});

process.on("SIGINT", () => {
  logger.info({ event: "shutdown_initiated" }, "SIGINT received, starting graceful shutdown");

  server.close(() => {
    logger.info({ event: "server_closed" }, "HTTP server closed");
    process.exit(0);
  });
});

// Uncaught Exception Handler
process.on("uncaughtException", (err) => {
  logger.fatal({
    event: "uncaught_exception",
    error: err.message,
    stack: err.stack,
  }, "Uncaught exception occurred");
  process.exit(1);
});

// Unhandled Rejection Handler
process.on("unhandledRejection", (reason, promise) => {
  logger.fatal({
    event: "unhandled_rejection",
    reason,
    promise,
  }, "Unhandled promise rejection");
  process.exit(1);
});

module.exports = app;
