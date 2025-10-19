require("dotenv").config();

const config = {
  port: process.env.PORT || 3000,
  socketPort: process.env.SOCKET_PORT || 8080,
  deepgramApiKey: process.env.DEEPGRAM_API_KEY,
  deepgramUrl: `wss://api.deepgram.com/v1/listen?model=nova-3&language=en`,
};

if (!config.deepgramApiKey) {
  console.error("DEEPGRAM_API_KEY not found in .env");
  process.exit(1);
}

module.exports = config;
