const app = require('./src/app');
const config = require('./src/config/env');
const connectDB = require('./src/config/db');

// Connect to Database
connectDB();
require("./src/jobs/delegateCleanup.job");

const PORT = config.port || 5000;

const server = app.listen(PORT, () => {
  console.log(`Server running in ${config.env} mode on port ${PORT}`);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err, promise) => {
  console.error(`Error: ${err.message}`);
  // Close server & exit process
  server.close(() => process.exit(1));
});
