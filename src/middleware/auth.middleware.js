const jwt = require('jsonwebtoken');
const config = require('../config/env');
const User = require('../models/User');

const protect = async (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    try {
      // Get token from header
      token = req.headers.authorization.split(' ')[1];

      // Verify token
      const decoded = jwt.verify(token, config.jwt.secret);

      // Get user from database
      const user = await User.findById(decoded.id);
      if (!user) {
        const err = new Error('User not found.');
        err.statusCode = 401;
        return next(err);
      }

      if (!user.isActive) {
        const err = new Error('User account is suspended.');
        err.statusCode = 401;
        return next(err);
      }

      req.user = user;
      next();
    } catch (error) {
      error.statusCode = 401;
      next(error);
    }
  } else {
    const err = new Error('Not authorized, no token provided.');
    err.statusCode = 401;
    return next(err);
  }
};

module.exports = protect;
