const xss = require("xss");

/**
 * Input Sanitization Middleware
 * Removes XSS attacks and sanitizes user input
 */
const sanitize = (req, res, next) => {
  // Sanitize request body
  if (req.body && typeof req.body === "object") {
    req.body = sanitizeObject(req.body);
  }

  // Sanitize request query
  if (req.query && typeof req.query === "object") {
    req.query = sanitizeObject(req.query);
  }

  // Sanitize request params
  if (req.params && typeof req.params === "object") {
    req.params = sanitizeObject(req.params);
  }

  next();
};

/**
 * Recursively sanitize objects
 * @param {Object} obj - Object to sanitize
 * @returns {Object} Sanitized object
 */
function sanitizeObject(obj) {
  if (Array.isArray(obj)) {
    return obj.map((item) =>
      typeof item === "string" ? xss(item) : sanitizeObject(item),
    );
  }

  if (obj !== null && typeof obj === "object") {
    const sanitized = {};
    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        const value = obj[key];
        sanitized[key] =
          typeof value === "string" ? xss(value) : sanitizeObject(value);
      }
    }
    return sanitized;
  }

  return typeof obj === "string" ? xss(obj) : obj;
}

module.exports = sanitize;
