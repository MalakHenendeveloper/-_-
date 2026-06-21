/**
 * Shared Validation Utility
 * Centralizes Joi validation logic used across all controllers
 * Ensures consistent error handling and validation messages
 */

const validate = (schema, data) => {
  const { error, value } = schema.validate(data, { abortEarly: false });
  if (error) {
    error.isJoi = true;
    throw error;
  }
  return value;
};

module.exports = validate;
