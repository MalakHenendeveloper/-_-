const dotenv = require('dotenv');
const path = require('path');
const Joi = require('joi');

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../../.env') });

const envVarsSchema = Joi.object()
  .keys({
    NODE_ENV: Joi.string().valid('development', 'production', 'test').default('development'),
    PORT: Joi.number().default(5000),
    MONGO_URI: Joi.string().required().description('MongoDB connection string'),
    JWT_SECRET: Joi.string().required().description('JWT Secret Key'),
    JWT_EXPIRE: Joi.string().default('15m'),
    JWT_REFRESH_SECRET: Joi.string().required().description('JWT Refresh Secret Key'),
    JWT_REFRESH_EXPIRE: Joi.string().default('30d'),
    CLOUDINARY_CLOUD_NAME: Joi.string().allow(''),
    CLOUDINARY_API_KEY: Joi.string().allow(''),
    CLOUDINARY_API_SECRET: Joi.string().allow(''),
    SMTP_HOST: Joi.string().allow(''),
    SMTP_PORT: Joi.number().default(2525),
    SMTP_USER: Joi.string().allow(''),
    SMTP_PASS: Joi.string().allow(''),
    SMS_API_KEY: Joi.string().allow(''),
    SMS_SENDER: Joi.string().default('MobileMaintenance'),
  })
  .unknown();

const { value: envVars, error } = envVarsSchema.prefs({ errors: { label: 'key' } }).validate(process.env);

if (error) {
  throw new Error(`Config validation error: ${error.message}`);
}

module.exports = {
  env: envVars.NODE_ENV,
  port: envVars.PORT,
  mongoose: {
    url: envVars.MONGO_URI,
    options: {}
  },
  jwt: {
    secret: envVars.JWT_SECRET,
    accessExpiration: envVars.JWT_EXPIRE,
    refreshSecret: envVars.JWT_REFRESH_SECRET,
    refreshExpiration: envVars.JWT_REFRESH_EXPIRE,
  },
  cloudinary: {
    cloudName: envVars.CLOUDINARY_CLOUD_NAME,
    apiKey: envVars.CLOUDINARY_API_KEY,
    apiSecret: envVars.CLOUDINARY_API_SECRET,
  },
  email: {
    smtp: {
      host: envVars.SMTP_HOST,
      port: envVars.SMTP_PORT,
      auth: {
        user: envVars.SMTP_USER,
        pass: envVars.SMTP_PASS,
      },
    },
  },
  sms: {
    apiKey: envVars.SMS_API_KEY,
    sender: envVars.SMS_SENDER,
  }
};
