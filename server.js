const express = require("express");
const cors = require("cors");

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Root path
app.get("/", (req, res) => {
  res.send("Server is running!");
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(
    `✅ Server listening on http://localhost:${process.env.PORT || 3000}`
  );
});

module.exports = app;
