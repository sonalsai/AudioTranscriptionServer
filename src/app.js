const express = require("express");
const cors = require("cors");
const httpLogger = require("./middleware/httpLogger");
const routes = require("./routes/routes");

/**
 * Create and configure Express application
 * @returns {express.Application} Configured Express app
 */
function createApp() {
  const app = express();

  // Middleware
  app.use(httpLogger);
  app.use(cors());
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Routes
  app.use("/", routes);

  return app;
}

module.exports = createApp;
