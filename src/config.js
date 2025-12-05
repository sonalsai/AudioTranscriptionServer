require("dotenv").config();
const logger = require("./logger");

const config = {
  port: process.env.PORT || 3000,
  socketPort: process.env.SOCKET_PORT || 8080,
  domain: process.env.DOMAIN || "localhost",
  protocol: process.env.PROTOCOL || "http",
  deepgramApiKey: process.env.DEEPGRAM_API_KEY,
  deepgramUrl: `wss://api.deepgram.com/v1/listen?model=nova-3&language=en`,
};

if (!config.deepgramApiKey) {
  logger.fatal({
    event: "config_error",
    missingVar: "DEEPGRAM_API_KEY",
  }, "DEEPGRAM_API_KEY not found in .env");
  process.exit(1);
}

module.exports = config;

