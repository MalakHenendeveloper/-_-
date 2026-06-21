const ApiResponse = require("../../src/utils/apiResponse");

describe("API Response Utility", () => {
  const mockRes = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
  };

  afterEach(() => {
    jest.clearAllMocks();
  });

  test("success should return proper response format", () => {
    const data = { id: 1, name: "Test" };
    const message = "Success";

    ApiResponse.success(mockRes, message, data, 200);

    expect(mockRes.status).toHaveBeenCalledWith(200);
    expect(mockRes.json).toHaveBeenCalledWith({
      success: true,
      message,
      data,
      pagination: undefined,
    });
  });

  test("success with pagination", () => {
    const data = [{ id: 1 }];
    const pagination = { page: 1, limit: 10, total: 100 };

    ApiResponse.success(mockRes, "Success", data, 200, pagination);

    expect(mockRes.status).toHaveBeenCalledWith(200);
    expect(mockRes.json).toHaveBeenCalledWith({
      success: true,
      message: "Success",
      data,
      pagination,
    });
  });

  test("error should return proper error format", () => {
    const message = "Error occurred";
    const statusCode = 400;

    ApiResponse.error(mockRes, message, statusCode);

    expect(mockRes.status).toHaveBeenCalledWith(statusCode);
    expect(mockRes.json).toHaveBeenCalledWith({
      success: false,
      message,
      statusCode,
      errors: [],
    });
  });

  test("error with validation errors", () => {
    const errors = [
      { field: "email", message: "Invalid email" },
      { field: "phone", message: "Required field" },
    ];

    ApiResponse.error(mockRes, "Validation failed", 422, errors);

    expect(mockRes.json).toHaveBeenCalledWith({
      success: false,
      message: "Validation failed",
      statusCode: 422,
      errors,
    });
  });

  test("default status code should be 200 for success", () => {
    ApiResponse.success(mockRes, "Test");

    expect(mockRes.status).toHaveBeenCalledWith(200);
  });

  test("default status code should be 400 for error", () => {
    ApiResponse.error(mockRes, "Test error");

    expect(mockRes.status).toHaveBeenCalledWith(400);
  });
});
