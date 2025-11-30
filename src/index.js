const express = require("express");
const cors = require("cors");
const http = require("http");
const WebSocket = require("ws");
const config = require("./config");

// Express App
const app = express();
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get("/", (req, res) => {
  res.send("Server is running!");
});

// HTTP Server
const server = http.createServer(app);

// WebSocket Server
const wss = new WebSocket.Server({ server });

wss.on("connection", (ws) => {
  console.log("Client connected");

  const deepgramWS = new WebSocket(config.deepgramUrl, {
    headers: {
      Authorization: `Token ${config.deepgramApiKey}`,
    },
  });

  let deepgramReady = false;

  deepgramWS.on("open", () => {
    console.log("Connected to Deepgram WebSocket");
    deepgramReady = true;
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: "ready" }));
    }
  });

  deepgramWS.on("message", (message) => {
    try {
      const data = JSON.parse(message.toString());
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify(data));
      }
    } catch (err) {
      console.error("Failed to parse Deepgram message:", err);
    }
  });

  deepgramWS.on("error", (err) => {
    console.error("Deepgram WS error:", err.message);
  });

  deepgramWS.on("close", (code, reason) => {
    console.log(`Deepgram connection closed: ${code} - ${reason}`);
  });

  ws.on("message", (msg) => {
    if (deepgramReady && deepgramWS.readyState === WebSocket.OPEN) {
      deepgramWS.send(msg);
    } else {
      console.warn("Deepgram not ready yet, dropping message");
    }
  });

  ws.on("close", () => {
    console.log("Client disconnected");
    deepgramWS.close();
  });

  ws.on("error", (err) => {
    console.error("Client WS error:", err.message);
  });
});

server.listen(config.port, () => {
  console.log(
    `Server listening on ${config.protocol}://${config.domain}:${config.port}`
  );
  console.log(
    `WebSocket server running on ${
      config.protocol === "https" ? "wss" : "ws"
    }://${config.domain}:${config.port}`
  );
});

module.exports = app;
