const Joi = require("joi");

/**
 * Validation middleware generator
 * @param {Joi.ObjectSchema} schema - Joi validation schema
 * @param {string} source - 'body', 'query', or 'params'
 * @returns {Function} Express middleware
 */
const validate = (schema, source = "body") => {
  return (req, res, next) => {
    const dataToValidate = req[source];

    const { error, value } = schema.validate(dataToValidate, {
      abortEarly: false,
      stripUnknown: true,
    });

    if (error) {
      const errors = error.details.map((detail) => ({
        field: detail.path.join("."),
        message: detail.message,
      }));

      return res.status(400).json({
        success: false,
        message: "خطأ في البيانات المدخلة",
        statusCode: 400,
        errors,
      });
    }

    req[source] = value;
    next();
  };
};

module.exports = validate;
