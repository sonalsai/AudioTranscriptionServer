const express = require("express");
const router = express.Router();

/**
 * Health check endpoint
 */
router.get("/", (req, res) => {
  req.log.info("Health check endpoint accessed");
  res.send("Server is running!");
});

/**
 * API health endpoint
 */
router.get("/health", (req, res) => {
  req.log.info("API health endpoint accessed");
  res.json({
    status: "healthy",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

module.exports = router;
