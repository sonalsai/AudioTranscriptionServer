require("dotenv").config();
const WebSocket = require("ws");

const Socket_PORT = process.env.SOCKET_PORT || 8080;
const wss = new WebSocket.Server({ port: Socket_PORT });

// Verify API key exists
if (!process.env.DEEPGRAM_API_KEY) {
  console.error("❌ DEEPGRAM_API_KEY not found in .env");
  process.exit(1);
}

const deepgramUrl = `wss://api.deepgram.com/v1/listen?model=nova-3&language=en`;

wss.on("connection", (ws) => {
  console.log("✅ Client connected");

  const deepgramWS = new WebSocket(deepgramUrl, {
    headers: {
      Authorization: `Token ${process.env.DEEPGRAM_API_KEY}`,
    },
  });

  let deepgramReady = false;

  deepgramWS.on("open", () => {
    console.log("✅ Connected to Deepgram WebSocket");
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
      console.error("❌ Failed to parse Deepgram message:", err);
    }
  });

  deepgramWS.on("error", (err) => {
    console.error("⚠️ Deepgram WS error:", err.message);
  });

  deepgramWS.on("close", (code, reason) => {
    console.log(`⚠️ Deepgram connection closed: ${code} - ${reason}`);
  });

  ws.on("message", (msg) => {
    if (deepgramReady && deepgramWS.readyState === WebSocket.OPEN) {
      deepgramWS.send(msg);
    } else {
      console.warn("⚠️ Deepgram not ready yet, dropping message");
    }
  });

  ws.on("close", () => {
    console.log("❌ Client disconnected");
    deepgramWS.close();
  });

  ws.on("error", (err) => {
    console.error("❌ Client WS error:", err.message);
  });
});

console.log(`🚀 WebSocket server running on ws://localhost:${Socket_PORT}`);
