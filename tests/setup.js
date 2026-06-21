// Jest setup file
process.env.NODE_ENV = "test";
process.env.JWT_SECRET = "test-secret-key";
process.env.JWT_REFRESH_SECRET = "test-refresh-secret";
process.env.MONGO_URI = "mongodb://localhost:27017/mobile-maintenance-test";

// Suppress logs during tests
global.console.log = jest.fn();
global.console.error = jest.fn();
global.console.warn = jest.fn();
