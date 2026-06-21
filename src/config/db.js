// const mongoose = require('mongoose');
// const config = require('./env');

// const connectDB = async () => {
//   try {
//     const conn = await mongoose.connect(config.mongoose.url, config.mongoose.options);
//     console.log(`MongoDB Connected: ${conn.connection.host}`);
//   } catch (error) {
//     console.error(`Database connection error: ${error.message}`);
//     process.exit(1);
//   }
// };

// module.exports = connectDB;
const mongoose = require("mongoose");
const config = require("./env");

const connectDB = async () => {
  try {
    console.log("=== CONNECT DB CALLED ===");
    console.log("Mongo URI Exists:", !!config.mongoose.url);

    const conn = await mongoose.connect(
      config.mongoose.url,
      config.mongoose.options,
    );

    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`Database connection error: ${error.message}`);
    process.exit(1);
  }
};

module.exports = connectDB;
