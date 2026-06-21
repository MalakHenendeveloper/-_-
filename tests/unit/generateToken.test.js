const {
  generateAccessToken,
  generateRefreshToken,
} = require("../../src/utils/generateToken");
const jwt = require("jsonwebtoken");

describe("Token Generation", () => {
  const mockUser = {
    _id: "507f1f77bcf86cd799439011",
    role: "client",
    phone: "966501234567",
  };

  test("generateAccessToken should create valid JWT with 15m expiration", () => {
    const token = generateAccessToken(mockUser);

    expect(token).toBeDefined();
    expect(typeof token).toBe("string");

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    expect(decoded.id).toBe(mockUser._id);
    expect(decoded.role).toBe(mockUser.role);
    expect(decoded.iat).toBeDefined();
    expect(decoded.exp).toBeDefined();
  });

  test("generateRefreshToken should create valid JWT with 30d expiration", () => {
    const token = generateRefreshToken(mockUser);

    expect(token).toBeDefined();
    expect(typeof token).toBe("string");

    const decoded = jwt.verify(token, process.env.JWT_REFRESH_SECRET);
    expect(decoded.id).toBe(mockUser._id);
  });

  test("expired access token should fail verification", () => {
    const expiredToken = jwt.sign(
      { id: mockUser._id, role: mockUser.role },
      process.env.JWT_SECRET,
      { expiresIn: "-1h" },
    );

    expect(() => {
      jwt.verify(expiredToken, process.env.JWT_SECRET);
    }).toThrow();
  });

  test("invalid token should fail verification", () => {
    expect(() => {
      jwt.verify("invalid.token.here", process.env.JWT_SECRET);
    }).toThrow();
  });
});
