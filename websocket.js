require("dotenv").config();
const WebSocket = require("ws");

const Socket_PORT = process.env.SOCKET_PORT || 8080;
const wss = new WebSocket.Server({ port: Socket_PORT });

const deepgramWSS = `wss://api.deepgram.com/v1/listen?access_token=${process.env.DEEPGRAM_API_KEY}`;

wss.on("connection", (ws) => {
  console.log("✅ Client connected");

  ws.on("message", (message) => {
    console.log(" Received message:", message.toString());
  });

  ws.on("close", () => {
    console.log(" Client disconnected");
  });

  ws.on("error", (err) => {
    console.error(" WebSocket error:", err);
  });
});

console.log(`🚀 WebSocket server running on ws://localhost:${Socket_PORT}`);
