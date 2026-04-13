require("dotenv").config();

const app = require("../src/app");
const { connectDb } = require("../src/config/db");

connectDb().catch((error) => {
  console.error("Vercel DB connection error", error);
});

module.exports = app;
