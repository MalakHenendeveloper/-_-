const mongoose = require("mongoose");
const config = require("./env");

let connectionPromise = null;

mongoose.connection.on("connected", () => {
  console.log("Mongo Connected");
});

mongoose.connection.on("disconnected", () => {
  connectionPromise = null;
  console.log("Mongo Disconnected");
});

mongoose.connection.on("reconnected", () => {
  console.log("Mongo Reconnected");
});

mongoose.connection.on("error", (err) => {
  console.error("Mongo Error:", err);
});

const connectDB = async () => {
  // State 1 is connected. State 2 means connecting, so callers must wait for
  // the shared promise rather than executing queries against a buffered model.
  if (mongoose.connection.readyState === 1) {
    return mongoose.connection;
  }

  if (connectionPromise) {
    return connectionPromise;
  }

  console.log("=== CONNECT DB CALLED ===");
  console.log("Mongo URI Exists:", !!config.mongoose.url);

  connectionPromise = mongoose
    .connect(config.mongoose.url, {
      serverSelectionTimeoutMS: 5000,
      connectTimeoutMS: 5000,
      socketTimeoutMS: 10000,
    })
    .then((conn) => {
      console.log(`MongoDB Connected: ${conn.connection.host}`);
      return conn;
    })
    .catch((error) => {
      connectionPromise = null;
      console.error("DATABASE CONNECTION FAILED");
      console.error(error);
      throw error;
    });

  return connectionPromise;
};

module.exports = connectDB;
