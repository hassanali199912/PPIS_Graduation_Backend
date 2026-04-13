const mongoose = require("mongoose");
let connectionPromise;

const connectDb = async () => {
  if (mongoose.connection.readyState === 1) {
    return mongoose.connection;
  }
  if (connectionPromise) {
    return connectionPromise;
  }

  const dbUri = process.env.DB_CONNECTION;
  if (!dbUri) {
    throw new Error("DB_CONNECTION is not set");
  }

  connectionPromise = mongoose
    .connect(dbUri, {
      serverSelectionTimeoutMS: 30000,
    })
    .catch((error) => {
      connectionPromise = null;
      throw error;
    });

  return connectionPromise;
};

module.exports = { connectDb };
