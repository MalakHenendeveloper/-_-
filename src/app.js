const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const rateLimit = require("express-rate-limit");
const config = require("./config/env");
const errorHandler = require("./middleware/errorHandler");
const sanitize = require("./middleware/sanitize.middleware");
const ApiResponse = require("./utils/apiResponse");

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

// Rate limiting for auth routes (strict)
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

// Import and use routes
const authRoutes = require("./routes/auth.routes");
const userRoutes = require("./routes/user.routes");
const repairCenterRoutes = require("./routes/repairCenter.routes");
const orderRoutes = require("./routes/order.routes");
const adminRoutes = require("./routes/admin.routes");
const delegateRoutes = require("./routes/delegate.routes");
const inspectionRoutes = require("./routes/inspection.routes");
const priceOfferRoutes = require("./routes/priceOffer.routes");

app.use("/api/auth", authLimiter, authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/centers", repairCenterRoutes);
app.use("/api/orders", sensitiveOperationsLimiter, orderRoutes);
app.use("/api/admin", sensitiveOperationsLimiter, adminRoutes);
app.use("/api/delegate", delegateRoutes);
app.use("/api/inspection", inspectionRoutes);
app.use("/api/price-offer", priceOfferRoutes);

// 404 Route handler
app.use((req, res, next) => {
  return ApiResponse.error(res, `Route not found: ${req.originalUrl}`, 404);
});

// Global Error Handler
app.use(errorHandler);

module.exports = app;
