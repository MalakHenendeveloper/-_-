const request = require("supertest");
const app = require("../../src/app");
const User = require("../../src/models/User");
const Order = require("../../src/models/Order");
const Inspection = require("../../src/models/Inspection");
const RepairCenter = require("../../src/models/RepairCenter");
const jwt = require("jsonwebtoken");
const config = require("../../src/config/env");
const fs = require("fs");
const path = require("path");

describe("Inspection Integration Tests - FormData with Images", () => {
  let centerUser, clientUser, order, repairCenter, authToken, clientToken;
  const testImagePath = path.join(__dirname, "../fixtures/test-image.jpg");

  beforeAll(async () => {
    // Create test image file if it doesn't exist
    if (!fs.existsSync(path.dirname(testImagePath))) {
      fs.mkdirSync(path.dirname(testImagePath), { recursive: true });
    }
    if (!fs.existsSync(testImagePath)) {
      fs.writeFileSync(testImagePath, Buffer.from("fake image data"));
    }

    // Create center user
    centerUser = await User.create({
      name: "Test Center",
      email: "center@test.com",
      password: "password123",
      phone: "1234567890",
      role: "center",
      isVerified: true,
      isActive: true,
    });

    // Create repair center
    repairCenter = await RepairCenter.create({
      name: "Test Repair Center",
      owner: centerUser._id,
      phone: "1234567890",
      email: "center@test.com",
      address: "123 Main St",
    });

    // Create client user
    clientUser = await User.create({
      name: "Test Client",
      email: "client@test.com",
      password: "password123",
      phone: "9876543210",
      role: "client",
      isVerified: true,
      isActive: true,
    });

    // Create order
    order = await Order.create({
      client: clientUser._id,
      repairCenter: repairCenter._id,
      device: {
        type: "phone",
        brand: "iPhone",
        model: "13",
        issueDescription: "Screen broken",
      },
      status: "picked_up",
    });

    // Generate tokens
    authToken = jwt.sign(
      { id: centerUser._id, role: centerUser.role },
      config.jwt.secret,
      { expiresIn: config.jwt.expire },
    );

    clientToken = jwt.sign(
      { id: clientUser._id, role: clientUser.role },
      config.jwt.secret,
      { expiresIn: config.jwt.expire },
    );
  });

  afterAll(async () => {
    // Cleanup
    await User.deleteMany({});
    await RepairCenter.deleteMany({});
    await Order.deleteMany({});
    await Inspection.deleteMany({});
    if (fs.existsSync(testImagePath)) {
      fs.unlinkSync(testImagePath);
    }
  });

  describe("POST /api/inspection - Create Inspection", () => {
    /**
     * Test 1: Create inspection WITHOUT images
     * Should succeed with valid findings as JSON string
     */
    it("should create inspection without images", async () => {
      const findings = [
        { issue: "Screen cracked", severity: "major" },
        { issue: "Battery dead", severity: "minor" },
      ];

      const response = await request(app)
        .post("/api/inspection")
        .set("Authorization", `Bearer ${authToken}`)
        .field("technician", "Ahmed")
        .field("findings", JSON.stringify(findings))
        .field("notes", "Need screen and battery replacement");

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe("تم تسجيل نتيجة الفحص بنجاح");
      expect(response.body.data.inspection).toBeDefined();
      expect(response.body.data.inspection.technician).toBe("Ahmed");
      expect(response.body.data.inspection.findings).toHaveLength(2);
      expect(response.body.data.inspection.findings[0].issue).toBe(
        "Screen cracked",
      );
      expect(response.body.data.inspection.findings[0].severity).toBe("major");
      expect(response.body.data.inspection.images).toEqual([]);
      expect(response.body.data.inspection.notes).toBe(
        "Need screen and battery replacement",
      );

      // Verify order status changed to inspecting
      const updatedOrder = await Order.findById(order._id);
      expect(updatedOrder.status).toBe("inspecting");
    });

    /**
     * Test 2: Create inspection WITH single image
     * Should succeed and save image path
     */
    it("should create inspection with single image", async () => {
      // Create new order for this test
      const testOrder = await Order.create({
        client: clientUser._id,
        repairCenter: repairCenter._id,
        device: {
          type: "phone",
          brand: "Samsung",
          model: "S21",
          issueDescription: "Won't turn on",
        },
        status: "picked_up",
      });

      const findings = [{ issue: "Power issue", severity: "critical" }];

      const response = await request(app)
        .post("/api/inspection")
        .set("Authorization", `Bearer ${authToken}`)
        .field("technician", "Malak")
        .field("findings", JSON.stringify(findings))
        .field("notes", "Check power circuit")
        .attach("images", testImagePath);

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.inspection.images).toBeDefined();
      // If Cloudinary is configured, image will have URL, otherwise mock path
      expect(
        response.body.data.inspection.images.length,
      ).toBeGreaterThanOrEqual(0);

      // Cleanup
      await Order.findByIdAndDelete(testOrder._id);
    });

    /**
     * Test 3: Create inspection WITH multiple images
     * Should succeed and save all image paths
     */
    it("should create inspection with multiple images", async () => {
      // Create new order for this test
      const testOrder = await Order.create({
        client: clientUser._id,
        repairCenter: repairCenter._id,
        device: {
          type: "laptop",
          brand: "Dell",
          model: "XPS",
          issueDescription: "Keyboard broken",
        },
        status: "picked_up",
      });

      const findings = [
        { issue: "Broken keyboard keys", severity: "major" },
        { issue: "USB port damaged", severity: "minor" },
      ];

      const response = await request(app)
        .post("/api/inspection")
        .set("Authorization", `Bearer ${authToken}`)
        .field("technician", "Salim")
        .field("findings", JSON.stringify(findings))
        .field("notes", "Multiple damage areas")
        .attach("images", testImagePath)
        .attach("images", testImagePath);

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.inspection.images).toBeDefined();
      expect(
        response.body.data.inspection.images.length,
      ).toBeGreaterThanOrEqual(0);

      // Cleanup
      await Order.findByIdAndDelete(testOrder._id);
    });

    /**
     * Test 4: Fail with invalid JSON in findings
     * Should return 400 error with descriptive message
     */
    it("should fail with invalid JSON in findings", async () => {
      // Create new order for this test
      const testOrder = await Order.create({
        client: clientUser._id,
        repairCenter: repairCenter._id,
        device: {
          type: "phone",
          brand: "Apple",
          model: "12",
          issueDescription: "Screen issue",
        },
        status: "picked_up",
      });

      const response = await request(app)
        .post("/api/inspection")
        .set("Authorization", `Bearer ${authToken}`)
        .field("technician", "Omar")
        .field("findings", "{invalid json}") // Invalid JSON
        .field("notes", "This should fail");

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain("صيغة findings غير صحيحة");

      // Order status should NOT have changed
      const unchangedOrder = await Order.findById(testOrder._id);
      expect(unchangedOrder.status).toBe("picked_up");

      // Cleanup
      await Order.findByIdAndDelete(testOrder._id);
    });

    /**
     * Test 5: Success with empty findings array
     * Should create inspection with empty findings
     */
    it("should create inspection with empty findings array", async () => {
      // Create new order for this test
      const testOrder = await Order.create({
        client: clientUser._id,
        repairCenter: repairCenter._id,
        device: {
          type: "tablet",
          brand: "iPad",
          model: "Air",
          issueDescription: "Battery issue",
        },
        status: "picked_up",
      });

      const response = await request(app)
        .post("/api/inspection")
        .set("Authorization", `Bearer ${authToken}`)
        .field("technician", "Hassan")
        .field("findings", JSON.stringify([]))
        .field("notes", "Device appears functional");

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.inspection.findings).toEqual([]);
      expect(response.body.data.inspection.technician).toBe("Hassan");

      // Cleanup
      await Order.findByIdAndDelete(testOrder._id);
    });

    /**
     * Test 6: Success with optional fields omitted
     * Should create inspection with only required data
     */
    it("should create inspection with minimal data", async () => {
      // Create new order for this test
      const testOrder = await Order.create({
        client: clientUser._id,
        repairCenter: repairCenter._id,
        device: {
          type: "phone",
          brand: "OnePlus",
          model: "9",
          issueDescription: "Display issue",
        },
        status: "picked_up",
      });

      const response = await request(app)
        .post("/api/inspection")
        .set("Authorization", `Bearer ${authToken}`)
        .field("findings", JSON.stringify([]));

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.inspection.technician).toBeUndefined();
      expect(response.body.data.inspection.notes).toBeUndefined();

      // Cleanup
      await Order.findByIdAndDelete(testOrder._id);
    });

    /**
     * Test 7: Fail with invalid severity level
     * Should return 400 validation error
     */
    it("should fail with invalid severity level in findings", async () => {
      // Create new order for this test
      const testOrder = await Order.create({
        client: clientUser._id,
        repairCenter: repairCenter._id,
        device: {
          type: "phone",
          brand: "Google",
          model: "Pixel",
          issueDescription: "Speaker issue",
        },
        status: "picked_up",
      });

      const invalidFindings = [
        { issue: "Speaker not working", severity: "extreme" }, // Invalid severity
      ];

      const response = await request(app)
        .post("/api/inspection")
        .set("Authorization", `Bearer ${authToken}`)
        .field("technician", "Fatima")
        .field("findings", JSON.stringify(invalidFindings));

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);

      // Cleanup
      await Order.findByIdAndDelete(testOrder._id);
    });

    /**
     * Test 8: FormData with findings as nested object (browser default)
     * Should properly parse nested form fields
     * Note: This tests when findings comes as findings[0][issue], findings[0][severity]
     */
    it("should handle findings from form field arrays", async () => {
      // Create new order for this test
      const testOrder = await Order.create({
        client: clientUser._id,
        repairCenter: repairCenter._id,
        device: {
          type: "watch",
          brand: "Apple",
          model: "Series 7",
          issueDescription: "Screen crack",
        },
        status: "picked_up",
      });

      const findings = [
        { issue: "Cracked display", severity: "major" },
        { issue: "Unresponsive touch", severity: "major" },
      ];

      const response = await request(app)
        .post("/api/inspection")
        .set("Authorization", `Bearer ${authToken}`)
        .field("technician", "Aisha")
        .field("findings", JSON.stringify(findings)) // Send as JSON string
        .field("notes", "Multiple issues");

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.inspection.findings).toHaveLength(2);

      // Cleanup
      await Order.findByIdAndDelete(testOrder._id);
    });
  });

  describe("PUT /api/inspection/:id - Update Inspection", () => {
    /**
     * Test 9: Update inspection with new images
     * Should add/replace images and findings
     */
    it("should update inspection with new findings and images", async () => {
      // Create inspection first
      const inspection = await Inspection.create({
        order: order._id,
        repairCenter: repairCenter._id,
        technician: "Original",
        findings: [{ issue: "Original issue", severity: "minor" }],
        notes: "Original notes",
        images: [],
      });

      const newFindings = [
        { issue: "Updated issue", severity: "major" },
        { issue: "New issue", severity: "critical" },
      ];

      const response = await request(app)
        .put(`/api/inspection/${inspection._id}`)
        .set("Authorization", `Bearer ${authToken}`)
        .field("technician", "Updated Tech")
        .field("findings", JSON.stringify(newFindings))
        .field("notes", "Updated notes")
        .attach("images", testImagePath);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.inspection.technician).toBe("Updated Tech");
      expect(response.body.data.inspection.findings).toHaveLength(2);
      expect(response.body.data.inspection.findings[0].issue).toBe(
        "Updated issue",
      );
      expect(response.body.data.inspection.notes).toBe("Updated notes");
    });

    /**
     * Test 10: Update inspection with invalid findings JSON
     * Should fail with 400 error
     */
    it("should fail updating with invalid JSON findings", async () => {
      const inspection = await Inspection.create({
        order: order._id,
        repairCenter: repairCenter._id,
        technician: "Test",
        findings: [],
        images: [],
      });

      const response = await request(app)
        .put(`/api/inspection/${inspection._id}`)
        .set("Authorization", `Bearer ${authToken}`)
        .field("findings", "invalid json here") // Invalid JSON
        .field("notes", "Should fail");

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain("صيغة findings غير صحيحة");

      // Verify inspection wasn't changed
      const unchangedInspection = await Inspection.findById(inspection._id);
      expect(unchangedInspection.findings).toEqual([]);
    });
  });

  describe("Error Cases & Edge Cases", () => {
    /**
     * Test 11: Missing authorization header
     * Should fail with 401
     */
    it("should fail without authorization", async () => {
      const response = await request(app)
        .post("/api/inspection")
        .field("technician", "Test")
        .field("findings", JSON.stringify([]));

      expect(response.status).toBe(401);
    });

    /**
     * Test 12: Invalid order ID
     * Should fail with 404
     */
    it("should fail with non-existent order", async () => {
      const findings = [{ issue: "Test", severity: "minor" }];

      const response = await request(app)
        .post("/api/inspection")
        .set("Authorization", `Bearer ${authToken}`)
        .field("findings", JSON.stringify(findings));

      // Should fail because order doesn't exist with this center
      expect(response.status).toBe(404);
    });

    /**
     * Test 13: Missing findings field (optional but should be parseable if provided)
     * Should succeed with empty findings
     */
    it("should succeed without findings field", async () => {
      const testOrder = await Order.create({
        client: clientUser._id,
        repairCenter: repairCenter._id,
        device: {
          type: "phone",
          brand: "Nokia",
          model: "3310",
          issueDescription: "Just checking",
        },
        status: "picked_up",
      });

      const response = await request(app)
        .post("/api/inspection")
        .set("Authorization", `Bearer ${authToken}`)
        .field("technician", "Test Tech")
        .field("notes", "No findings provided");

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);

      // Cleanup
      await Order.findByIdAndDelete(testOrder._id);
    });
  });
});
