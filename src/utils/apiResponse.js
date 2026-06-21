class ApiResponse {
  static success(res, message, data = {}, statusCode = 200, pagination = null) {
    const response = {
      success: true,
      message,
      data
    };
    if (pagination) {
      response.pagination = pagination;
    }
    return res.status(statusCode).json(response);
  }

  static error(res, message, statusCode = 400, errors = []) {
    return res.status(statusCode).json({
      success: false,
      message,
      statusCode,
      errors
    });
  }
}

module.exports = ApiResponse;
