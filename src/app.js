const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const rateLimit = require("express-rate-limit");
const mongoose = require("mongoose");

const config = require("./config/env");
const connectDB = require("./config/db");
const errorHandler = require("./middleware/errorHandler");
const sanitize = require("./middleware/sanitize.middleware");
const ApiResponse = require("./utils/apiResponse");

// Connect MongoDB
connectDB()
  .then(() => {
    console.log("MongoDB Connected From App");
  })
  .catch((err) => {
    console.error("MongoDB Connection Failed:", err);
  });

const app = express();

// Global middleware
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(sanitize);

if (config.env === "development") {
  app.use(morgan("dev"));
}

// Rate limiting for auth routes
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 1000,
  message: {
    success: false,
    message: "Too many authentication attempts, please try again later.",
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Rate limiting for sensitive operations
const sensitiveOperationsLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 50,
  message: {
    success: false,
    message: "Too many requests, please try again later.",
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Root route
app.get("/", (req, res) => {
  return ApiResponse.success(res, "Welcome to Mobile Maintenance API");
});

// Health check endpoint
app.get("/health", (req, res) => {
  return ApiResponse.success(res, "API is healthy", {
    status: "ok",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: config.env,
  });
});

// MongoDB test endpoint
// app.get("/db-test", async (req, res) => {
//   return res.json({
//     readyState: mongoose.connection.readyState,
//     mongoConnected: mongoose.connection.readyState === 1,
//   });
// });

app.get("/db-test", async (req, res) => {
  try {
    await connectDB();

    return res.json({
      readyState: mongoose.connection.readyState,
      mongoConnected: mongoose.connection.readyState === 1,
      host: mongoose.connection.host,
      dbName: mongoose.connection.name,
    });
  } catch (e) {
    return res.status(500).json({
      readyState: mongoose.connection.readyState,
      error: e.message,
      stack: e.stack,
    });
  }
});

// Routes
const authRoutes = require("./routes/auth.routes");
const userRoutes = require("./routes/user.routes");
const repairCenterRoutes = require("./routes/repairCenter.routes");
const orderRoutes = require("./routes/order.routes");
const adminRoutes = require("./routes/admin.routes");
const delegateRoutes = require("./routes/delegate.routes");
const inspectionRoutes = require("./routes/inspection.routes");
const priceOfferRoutes = require("./routes/priceOffer.routes");
const centerServiceRoutes = require("./routes/centerService.routes");
app.use("/api/auth", authLimiter, authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/centers", repairCenterRoutes);
app.use("/api/orders", sensitiveOperationsLimiter, orderRoutes);
app.use("/api/admin", sensitiveOperationsLimiter, adminRoutes);
app.use("/api/delegate", delegateRoutes);
app.use("/api/inspection", inspectionRoutes);
app.use("/api/price-offer", priceOfferRoutes);
app.use("/api/center/services", centerServiceRoutes);
//
//
app.get("/env-test", (req, res) => {
  res.json({
    mongoExists: !!config.mongoose.url,
    mongoPrefix: config.mongoose.url?.substring(0, 200),
    mongoLength: config.mongoose.url?.length,
  });
});
// 404 handler
app.use((req, res) => {
  return ApiResponse.error(res, `Route not found: ${req.originalUrl}`, 404);
});

// Global Error Handler
app.use(errorHandler);

module.exports = app;
