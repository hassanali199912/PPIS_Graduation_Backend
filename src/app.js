const express = require("express");
const cors = require("cors");
const mainRouter = require("./routes/api.routes");
const { connectDb } = require("./config/db");

const app = express();

app.use(express.json());
app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader(
    "Access-Control-Allow-Methods",
    "OPTIONS, GET, POST, PUT, PATCH, DELETE",
  );
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  next();
});

app.use(cors());

app.use(async (req, res, next) => {
  // Keep health check light even if DB is down.
  if (req.path === "/test") return next();
  try {
    await connectDb();
    return next();
  } catch (error) {
    return res.status(500).json({
      message: "Database connection failed",
      error: error.message,
    });
  }
});

app.use("/api", mainRouter);
app.use("/test", (req, res) => {
  res.status(200).json({
    message: "It Works ❤️❤️👍",
    status: 200,
    authorizer: {
      name: "Hassan Ali Hassan",
      email: "hassanalihassan1203@gmail.com",
      github: "https://github.com/hassanali199912",
    },
  });
});

module.exports = app;
