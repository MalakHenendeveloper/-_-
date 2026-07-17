// module.exports = connectDB;
const mongoose = require("mongoose");
const config = require("./env");

const connectDB = async () => {
  try {
    if (mongoose.connection.readyState >= 1) {
      return mongoose.connection;
    }

    console.log("=== CONNECT DB CALLED ===");
    console.log("Mongo URI Exists:", !!config.mongoose.url);

    const conn = await mongoose.connect(config.mongoose.url, {
      serverSelectionTimeoutMS: 5000,
      connectTimeoutMS: 5000,
      socketTimeoutMS: 10000,
    });

    mongoose.connection.on("connected", () => {
      console.log("🟢 Mongo Connected");
    });

    mongoose.connection.on("disconnected", () => {
      console.log("🔴 Mongo Disconnected");
    });

    mongoose.connection.on("reconnected", () => {
      console.log("🟡 Mongo Reconnected");
    });

    mongoose.connection.on("error", (err) => {
      console.error("🔥 Mongo Error:", err);
    });
    console.log(`MongoDB Connected: ${conn.connection.host}`);

    return conn;
  } catch (error) {
    console.error("DATABASE CONNECTION FAILED");
    console.error(error);
    throw error;
  }
};

module.exports = connectDB;
