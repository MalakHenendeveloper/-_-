const config = require('../config/env');

const sendSMS = async (phone, message) => {
  // In development/test mode, we log to console
  console.log(`[MOCK SMS] To: ${phone}, Message: ${message}`);
  return true;
};

module.exports = sendSMS;
