const jwt = require('jsonwebtoken');
const config = require('../config/env');

const generateAccessToken = (user) => {
  return jwt.sign(
    { id: user._id, role: user.role },
    config.jwt.secret,
    { expiresIn: config.jwt.accessExpiration }
  );
};

const generateRefreshToken = (user) => {
  return jwt.sign(
    { id: user._id },
    config.jwt.refreshSecret,
    { expiresIn: config.jwt.refreshExpiration }
  );
};

module.exports = {
  generateAccessToken,
  generateRefreshToken
};
