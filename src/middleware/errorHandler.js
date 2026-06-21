const ApiResponse = require("../utils/apiResponse");

const errorHandler = (err, req, res, next) => {
  let statusCode = err.statusCode || 500;
  let message = err.message || "Internal Server Error";
  let errors = err.errors || [];

  try {
    // Mongoose validation error
    if (err.name === "ValidationError") {
      statusCode = 400;
      message = "Validation Error";
      errors = Object.values(err.errors || {}).map(
        (val) => val?.message || "Unknown validation error",
      );
    }

    // MongoDB CastError (invalid ObjectId)
    if (err.name === "CastError") {
      statusCode = 400;
      message = "Invalid ID format";
      errors = [`Invalid ${err.kind}: ${err.value}`];
    }

    // Mongoose duplicate key error
    if (err.code === 11000) {
      statusCode = 400;
      message = "Duplicate Entry Error";
      const field = Object.keys(err.keyValue || {})[0] || "field";
      errors = [`${field} already exists.`];
    }

    // Joi validation error
    if (err.isJoi) {
      statusCode = 400;
      message = "Request Validation Error";
      errors = (err.details || []).map(
        (detail) => detail?.message || "Validation failed",
      );
    }

    // JWT errors
    if (err.name === "JsonWebTokenError") {
      statusCode = 401;
      message = "Invalid token.";
    }
    if (err.name === "TokenExpiredError") {
      statusCode = 401;
      message = "Token expired.";
    }

    // TypeError (null/undefined access, etc.)
    if (err.name === "TypeError") {
      statusCode = 400;
      message = "Invalid request data";
      if (process.env.NODE_ENV === "development") {
        errors = [err.message];
      }
    }

    // ReferenceError
    if (err.name === "ReferenceError") {
      statusCode = 500;
      message = "Internal server error";
      if (process.env.NODE_ENV === "development") {
        errors = [err.message];
      }
    }
  } catch (handlerError) {
    // Fallback if error handling itself fails
    statusCode = 500;
    message = "Internal Server Error";
    errors = [];
    if (process.env.NODE_ENV === "development") {
      console.error("Error handler failed:", handlerError);
    }
  }

  // Log errors in development
  if (process.env.NODE_ENV === "development") {
    console.error("[ERROR]", {
      name: err.name,
      message: err.message,
      statusCode: statusCode,
      stack: err.stack,
    });
  }

  return ApiResponse.error(res, message, statusCode, errors);
};

module.exports = errorHandler;
