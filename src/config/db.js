const mongoose = require("mongoose");

const connectDb = async () => {
  if (mongoose.connection.readyState === 1) return mongoose.connection;

  const dbUri = process.env.DB_CONNECTION;
  if (!dbUri) {
    throw new Error("DB_CONNECTION is not set");
  }

  return mongoose.connect(dbUri);
};

module.exports = { connectDb };
