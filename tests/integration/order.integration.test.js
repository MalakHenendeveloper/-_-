const request = require("supertest");
const mongoose = require("mongoose");
const app = require("../../src/app");
const Order = require("../../src/models/Order");
const User = require("../../src/models/User");
const RepairCenter = require("../../src/models/RepairCenter");

describe.skip("Order Integration Tests", () => {
  let clientToken, clientUser, centerUser, repairCenter;

  beforeAll(async () => {
    if (mongoose.connection.readyState === 0) {
      // Connect to test database if needed
    }
  });

  beforeEach(async () => {
    if (mongoose.connection.readyState) {
      await Order.deleteMany({});
      await User.deleteMany({});
      await RepairCenter.deleteMany({});

      // Create test users
      clientUser = await User.create({
        phone: "966501234567",
        password: "Test@123",
        name: "Test Client",
        role: "client",
        isVerified: true,
        isActive: true,
      });

      centerUser = await User.create({
        phone: "966501234568",
        password: "Test@123",
        name: "Test Center Owner",
        role: "center",
        isVerified: true,
        isActive: true,
      });

      // Create repair center
      repairCenter = await RepairCenter.create({
        owner: centerUser._id,
        name: "Test Repair Center",
        phone: "966501234568",
        email: "center@test.com",
        address: "Test Address",
        city: "Riyadh",
        inspectionFee: 50,
      });

      // Get client token
      const loginResponse = await request(app).post("/api/auth/login").send({
        phone: "966501234567",
        password: "Test@123",
      });

      clientToken = loginResponse.body.data.accessToken;
    }
  });

  afterEach(async () => {
    if (mongoose.connection.readyState) {
      await Order.deleteMany({});
      await User.deleteMany({});
      await RepairCenter.deleteMany({});
    }
  });

  afterAll(async () => {
    if (mongoose.connection.readyState) {
      await mongoose.connection.close();
    }
  });

  describe("POST /api/orders", () => {
    test("should create order with valid data", async () => {
      const response = await request(app)
        .post("/api/orders")
        .set("Authorization", `Bearer ${clientToken}`)
        .send({
          device: {
            type: "phone",
            brand: "Apple",
            model: "iPhone 13",
            problemType: "screen",
            problemDescription: "Broken screen",
          },
          pickupAddress: {
            address: "123 Test Street",
            city: "Riyadh",
            coordinates: { lat: 24.7136, lng: 46.6753 },
          },
          repairCenter: repairCenter._id,
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.orderNumber).toBeDefined();
      expect(response.body.data.status).toBe("pending");
    });

    test("should require authentication", async () => {
      const response = await request(app)
        .post("/api/orders")
        .send({
          device: {
            type: "phone",
            brand: "Apple",
            model: "iPhone 13",
            problemType: "screen",
            problemDescription: "Broken screen",
          },
        });

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });

    test("should validate required fields", async () => {
      const response = await request(app)
        .post("/api/orders")
        .set("Authorization", `Bearer ${clientToken}`)
        .send({
          device: {
            type: "phone",
            brand: "Apple",
            // Missing required fields
          },
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });

  describe("GET /api/orders", () => {
    beforeEach(async () => {
      if (mongoose.connection.readyState) {
        // Create test orders
        await Order.create({
          client: clientUser._id,
          device: {
            type: "phone",
            brand: "Apple",
            model: "iPhone 13",
            problemType: "screen",
            problemDescription: "Broken screen",
          },
          pickupAddress: {
            address: "123 Test Street",
            city: "Riyadh",
            coordinates: { lat: 24.7136, lng: 46.6753 },
          },
        });
      }
    });

    test("should fetch client orders with pagination", async () => {
      const response = await request(app)
        .get("/api/orders?limit=10&page=1")
        .set("Authorization", `Bearer ${clientToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.pagination).toBeDefined();
    });

    test("should require authentication", async () => {
      const response = await request(app).get("/api/orders");

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });
  });

  describe("GET /api/orders/:id", () => {
    let orderId;

    beforeEach(async () => {
      if (mongoose.connection.readyState) {
        const order = await Order.create({
          client: clientUser._id,
          device: {
            type: "phone",
            brand: "Apple",
            model: "iPhone 13",
            problemType: "screen",
            problemDescription: "Broken screen",
          },
          pickupAddress: {
            address: "123 Test Street",
            city: "Riyadh",
            coordinates: { lat: 24.7136, lng: 46.6753 },
          },
        });
        orderId = order._id;
      }
    });

    test("should fetch order details", async () => {
      const response = await request(app)
        .get(`/api/orders/${orderId}`)
        .set("Authorization", `Bearer ${clientToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data._id).toBe(orderId.toString());
    });

    test("should return 404 for non-existent order", async () => {
      const fakeId = new mongoose.Types.ObjectId();
      const response = await request(app)
        .get(`/api/orders/${fakeId}`)
        .set("Authorization", `Bearer ${clientToken}`);

      expect(response.status).toBe(404);
    });
  });

  describe("PUT /api/orders/:id/rate", () => {
    let orderId;

    beforeEach(async () => {
      if (mongoose.connection.readyState) {
        const order = await Order.create({
          client: clientUser._id,
          device: {
            type: "phone",
            brand: "Apple",
            model: "iPhone 13",
            problemType: "screen",
            problemDescription: "Broken screen",
          },
          pickupAddress: {
            address: "123 Test Street",
            city: "Riyadh",
            coordinates: { lat: 24.7136, lng: 46.6753 },
          },
          status: "delivered",
        });
        orderId = order._id;
      }
    });

    test("should rate delivered order", async () => {
      const response = await request(app)
        .put(`/api/orders/${orderId}/rate`)
        .set("Authorization", `Bearer ${clientToken}`)
        .send({
          score: 5,
          comment: "Excellent service",
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.rating.score).toBe(5);
    });

    test("should not allow duplicate rating", async () => {
      if (mongoose.connection.readyState) {
        await Order.findByIdAndUpdate(orderId, {
          rating: { score: 5, comment: "Already rated" },
        });
      }

      const response = await request(app)
        .put(`/api/orders/${orderId}/rate`)
        .set("Authorization", `Bearer ${clientToken}`)
        .send({
          score: 4,
          comment: "New rating",
        });

      expect(response.status).toBe(400);
    });
  });
});
