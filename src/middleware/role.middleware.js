const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      const err = new Error(`User role '${req.user ? req.user.role : 'none'}' is not authorized to access this route.`);
      err.statusCode = 403;
      return next(err);
    }
    next();
  };
};

module.exports = authorize;
