/**
 * Database Seeding Script
 * Run with: node scripts/seed.js
 *
 * This script populates the database with sample data for testing
 * SECURITY: Only runs in development/test mode, never in production
 */

require("dotenv").config({ path: ".env" });
const mongoose = require("mongoose");
const config = require("../src/config/env");
const User = require("../src/models/User");
const RepairCenter = require("../src/models/RepairCenter");
const Order = require("../src/models/Order");
const Inspection = require("../src/models/Inspection");
const PriceOffer = require("../src/models/PriceOffer");

// FIX #7: Prevent seed script execution in production
if (config.env === "production") {
  console.error("❌ ERROR: Seed script cannot run in production environment!");
  console.error("This is a security measure to prevent accidental data loss.");
  process.exit(1);
}

if (config.env !== "development" && config.env !== "test") {
  console.warn(
    `⚠️  WARNING: Seed script should only run in development or test mode. Current env: ${config.env}`,
  );
}

const connectDB = async () => {
  try {
    // FIX #8: Use correct config path - config.mongoose.url (consistent with db.js)
    await mongoose.connect(config.mongoose.url, config.mongoose.options);
    console.log("✅ MongoDB Connected");
  } catch (error) {
    console.error("❌ MongoDB Connection Error:", error);
    process.exit(1);
  }
};

const seedDatabase = async () => {
  try {
    // Clear existing data
    await User.deleteMany({});
    await RepairCenter.deleteMany({});
    await Order.deleteMany({});
    await Inspection.deleteMany({});
    await PriceOffer.deleteMany({});
    console.log("🗑️  Cleared existing data");

    // Create admin user
    const adminUser = await User.create({
      name: "Admin User",
      phone: "966501234567",
      email: "admin@mobilemaintenance.com",
      password: "Admin@123456",
      role: "admin",
      isVerified: true,
      isActive: true,
    });
    console.log("✅ Admin user created");

    // Create 5 client users
    const clients = await User.create([
      {
        name: "أحمد محمد",
        phone: "966501234568",
        email: "client1@example.com",
        password: "Client@123456",
        role: "client",
        isVerified: true,
        isActive: true,
        addresses: [
          {
            label: "البيت",
            address: "شارع التحرير، الرياض",
            city: "Riyadh",
            coordinates: { lat: 24.7136, lng: 46.6753 },
          },
        ],
      },
      {
        name: "فاطمة علي",
        phone: "966501234569",
        email: "client2@example.com",
        password: "Client@123456",
        role: "client",
        isVerified: true,
        isActive: true,
      },
      {
        name: "محمود حسن",
        phone: "966501234590",
        email: "client3@example.com",
        password: "Client@123456",
        role: "client",
        isVerified: true,
        isActive: true,
      },
      {
        name: "ليلى أحمد",
        phone: "966501234591",
        email: "client4@example.com",
        password: "Client@123456",
        role: "client",
        isVerified: true,
        isActive: true,
      },
      {
        name: "عمر إبراهيم",
        phone: "966501234592",
        email: "client5@example.com",
        password: "Client@123456",
        role: "client",
        isVerified: true,
        isActive: true,
      },
    ]);
    console.log("✅ 5 Client users created");

    // Create 3 delegate users
    const delegates = await User.create([
      {
        name: "محمد إبراهيم",
        phone: "966501234570",
        email: "delegate1@example.com",
        password: "Delegate@123456",
        role: "delegate",
        isVerified: true,
        isActive: true,
      },
      {
        name: "سارة أحمد",
        phone: "966501234571",
        email: "delegate2@example.com",
        password: "Delegate@123456",
        role: "delegate",
        isVerified: true,
        isActive: true,
      },
      {
        name: "علي محمد",
        phone: "966501234593",
        email: "delegate3@example.com",
        password: "Delegate@123456",
        role: "delegate",
        isVerified: true,
        isActive: true,
      },
    ]);
    console.log("✅ 3 Delegate users created");

    // Create 3 center owner users
    const centerOwners = await User.create([
      {
        name: "مركز الإصلاح الأول",
        phone: "966501234572",
        email: "center1@example.com",
        password: "Center@123456",
        role: "center",
        isVerified: true,
        isActive: true,
      },
      {
        name: "مركز الإصلاح الثاني",
        phone: "966501234573",
        email: "center2@example.com",
        password: "Center@123456",
        role: "center",
        isVerified: true,
        isActive: true,
      },
      {
        name: "مركز الإصلاح الثالث",
        phone: "966501234594",
        email: "center3@example.com",
        password: "Center@123456",
        role: "center",
        isVerified: true,
        isActive: true,
      },
    ]);
    console.log("✅ 3 Center owner users created");

    // Create 3 repair centers
    const centers = await RepairCenter.create([
      {
        name: "مركز الإصلاح المحترف",
        owner: centerOwners[0]._id,
        phone: "966501234572",
        email: "center1@example.com",
        address: "حي السفارات، الرياض",
        city: "Riyadh",
        coordinates: { lat: 24.7289, lng: 46.6748 },
        status: "active",
        supportedBrands: ["Apple", "Samsung", "Huawei", "Xiaomi"],
        supportedDeviceTypes: ["phone", "tablet", "laptop"],
        inspectionFee: 50,
        rating: 4.5,
        totalRatings: 120,
      },
      {
        name: "مركز الصيانة السريعة",
        owner: centerOwners[1]._id,
        phone: "966501234573",
        email: "center2@example.com",
        address: "حي العليا، الرياض",
        city: "Riyadh",
        coordinates: { lat: 24.7652, lng: 46.6926 },
        status: "active",
        supportedBrands: ["Apple", "Samsung", "Oppo"],
        supportedDeviceTypes: ["phone"],
        inspectionFee: 40,
        rating: 4.8,
        totalRatings: 250,
      },
      {
        name: "مركز الصيانة الموثوق",
        owner: centerOwners[2]._id,
        phone: "966501234594",
        email: "center3@example.com",
        address: "حي الملز، الرياض",
        city: "Riyadh",
        coordinates: { lat: 24.7408, lng: 46.7085 },
        status: "active",
        supportedBrands: ["Apple", "Samsung", "Huawei", "OnePlus"],
        supportedDeviceTypes: ["phone", "tablet"],
        inspectionFee: 45,
        rating: 4.6,
        totalRatings: 180,
      },
    ]);
    console.log("✅ 3 Repair centers created");

    // Create 10 sample orders covering all statuses
    const orders = await Order.create([
      // Order 1: pending
      {
        client: clients[0]._id,
        repairCenter: centers[0]._id,
        device: {
          type: "phone",
          brand: "Apple",
          model: "iPhone 14",
          problemType: "screen",
          problemDescription: "الشاشة بها كسور",
          images: ["https://example.com/image1.jpg"],
        },
        pickupAddress: {
          address: "شارع التحرير، الرياض",
          city: "Riyadh",
          coordinates: { lat: 24.7136, lng: 46.6753 },
        },
        fees: { inspection: 50, delivery: 30, repair: 0, total: 80 },
        status: "pending",
        paymentStatus: "unpaid",
      },
      // Order 2: delegate_assigned
      {
        client: clients[1]._id,
        repairCenter: centers[0]._id,
        delegate: delegates[0]._id,
        device: {
          type: "phone",
          brand: "Samsung",
          model: "Galaxy S23",
          problemType: "battery",
          problemDescription: "البطارية تفرغ بسرعة",
          images: [],
        },
        pickupAddress: {
          address: "حي السفارات، الرياض",
          city: "Riyadh",
          coordinates: { lat: 24.7289, lng: 46.6748 },
        },
        fees: { inspection: 40, delivery: 25, repair: 0, total: 65 },
        status: "delegate_assigned",
        paymentStatus: "unpaid",
        statusHistory: [
          {
            status: "pending",
            note: "تم إنشاء الطلب",
            updatedBy: clients[1]._id,
          },
          {
            status: "delegate_assigned",
            note: "تم تعيين المندوب",
            updatedBy: adminUser._id,
          },
        ],
      },
      // Order 3: at_center
      {
        client: clients[2]._id,
        repairCenter: centers[0]._id,
        delegate: delegates[0]._id,
        device: {
          type: "tablet",
          brand: "Apple",
          model: "iPad Pro",
          problemType: "software",
          problemDescription: "النظام بطيء جداً",
          images: [],
        },
        pickupAddress: {
          address: "حي الملز، الرياض",
          city: "Riyadh",
          coordinates: { lat: 24.7408, lng: 46.7085 },
        },
        fees: { inspection: 50, delivery: 30, repair: 0, total: 80 },
        status: "at_center",
        paymentStatus: "unpaid",
      },
      // Order 4: inspecting
      {
        client: clients[3]._id,
        repairCenter: centers[1]._id,
        delegate: delegates[1]._id,
        device: {
          type: "phone",
          brand: "Huawei",
          model: "P50",
          problemType: "camera",
          problemDescription: "الكاميرا لا تعمل",
          images: [],
        },
        pickupAddress: {
          address: "حي العليا، الرياض",
          city: "Riyadh",
          coordinates: { lat: 24.7652, lng: 46.6926 },
        },
        fees: { inspection: 40, delivery: 0, repair: 0, total: 40 },
        status: "inspecting",
        paymentStatus: "unpaid",
      },
      // Order 5: awaiting_approval
      {
        client: clients[0]._id,
        repairCenter: centers[1]._id,
        delegate: delegates[1]._id,
        device: {
          type: "phone",
          brand: "Samsung",
          model: "A53",
          problemType: "charging",
          problemDescription: "الجهاز لا يشحن",
          images: [],
        },
        pickupAddress: {
          address: "شارع التحرير، الرياض",
          city: "Riyadh",
          coordinates: { lat: 24.7136, lng: 46.6753 },
        },
        fees: { inspection: 40, delivery: 0, repair: 150, total: 190 },
        status: "awaiting_approval",
        paymentStatus: "unpaid",
      },
      // Order 6: approved
      {
        client: clients[4]._id,
        repairCenter: centers[2]._id,
        delegate: delegates[2]._id,
        device: {
          type: "phone",
          brand: "Xiaomi",
          model: "13",
          problemType: "display",
          problemDescription: "الشاشة تومضة",
          images: [],
        },
        pickupAddress: {
          address: "حي الملز، الرياض",
          city: "Riyadh",
          coordinates: { lat: 24.7408, lng: 46.7085 },
        },
        fees: { inspection: 45, delivery: 0, repair: 200, total: 245 },
        status: "approved",
        paymentStatus: "pending",
      },
      // Order 7: repairing
      {
        client: clients[1]._id,
        repairCenter: centers[0]._id,
        delegate: delegates[0]._id,
        device: {
          type: "laptop",
          brand: "Apple",
          model: "MacBook Pro",
          problemType: "hard_drive",
          problemDescription: "القرص الصلب تالف",
          images: [],
        },
        pickupAddress: {
          address: "حي السفارات، الرياض",
          city: "Riyadh",
          coordinates: { lat: 24.7289, lng: 46.6748 },
        },
        fees: { inspection: 50, delivery: 50, repair: 500, total: 600 },
        status: "repairing",
        paymentStatus: "pending",
      },
      // Order 8: returning
      {
        client: clients[2]._id,
        repairCenter: centers[1]._id,
        delegate: delegates[1]._id,
        device: {
          type: "phone",
          brand: "Apple",
          model: "iPhone 13",
          problemType: "screen",
          problemDescription: "الشاشة كسورة",
          images: [],
        },
        pickupAddress: {
          address: "حي الملز، الرياض",
          city: "Riyadh",
          coordinates: { lat: 24.7408, lng: 46.7085 },
        },
        fees: { inspection: 40, delivery: 30, repair: 300, total: 370 },
        status: "returning",
        paymentStatus: "paid",
      },
      // Order 9: delivered and rated
      {
        client: clients[3]._id,
        repairCenter: centers[2]._id,
        delegate: delegates[2]._id,
        device: {
          type: "phone",
          brand: "Samsung",
          model: "Galaxy S22",
          problemType: "battery",
          problemDescription: "البطارية تفرغ بسرعة",
          images: [],
        },
        pickupAddress: {
          address: "حي العليا، الرياض",
          city: "Riyadh",
          coordinates: { lat: 24.7652, lng: 46.6926 },
        },
        fees: { inspection: 45, delivery: 30, repair: 250, total: 325 },
        status: "delivered",
        paymentStatus: "paid",
        rating: { score: 5, comment: "خدمة ممتازة جداً" },
      },
      // Order 10: cancelled
      {
        client: clients[4]._id,
        repairCenter: centers[0]._id,
        device: {
          type: "phone",
          brand: "Oppo",
          model: "A96",
          problemType: "audio",
          problemDescription: "السماعات لا تعمل",
          images: [],
        },
        pickupAddress: {
          address: "حي السفارات، الرياض",
          city: "Riyadh",
          coordinates: { lat: 24.7289, lng: 46.6748 },
        },
        fees: { inspection: 50, delivery: 0, repair: 0, total: 50 },
        status: "cancelled",
        paymentStatus: "cancelled",
      },
    ]);
    console.log("✅ 10 Orders created (covering all statuses)");

    // Create 3 inspections
    const inspections = await Inspection.create([
      {
        order: orders[3]._id, // inspecting order
        repairCenter: centers[1]._id,
        technician: "فني متخصص 1",
        findings: [
          {
            issue: "الكاميرا الخلفية لا تعمل",
            severity: "major",
          },
          {
            issue: "قطع صغير في الهيكل",
            severity: "minor",
          },
        ],
        notes: "الجهاز يحتاج لاستبدال الكاميرا",
        images: [],
      },
      {
        order: orders[4]._id, // awaiting_approval order
        repairCenter: centers[1]._id,
        technician: "فني متخصص 2",
        findings: [
          {
            issue: "مشكلة في منفذ الشحن",
            severity: "major",
          },
        ],
        notes: "المنفذ يحتاج لتنظيف عميق أو استبدال",
        images: [],
      },
      {
        order: orders[6]._id, // repairing order
        repairCenter: centers[0]._id,
        technician: "فني متخصص 3",
        findings: [
          {
            issue: "القرص الصلب تالف تماماً",
            severity: "critical",
          },
        ],
        notes: "يحتاج لاستبدال القرص الصلب",
        images: [],
      },
    ]);
    console.log("✅ 3 Inspections created");

    // Create 3 price offers
    const offers = await PriceOffer.create([
      {
        order: orders[4]._id, // awaiting_approval order
        repairCenter: centers[1]._id,
        spareParts: [
          { name: "منفذ USB Type-C", cost: 30 },
          { name: "مواد التنظيف والصيانة", cost: 10 },
        ],
        laborCost: 60,
        inspectionFee: 40,
        deliveryFee: 20,
        totalCost: 160,
        estimatedDays: 2,
        notes: "عرض سعر للإصلاح السريع",
        status: "pending",
      },
      {
        order: orders[6]._id, // repairing order (approved)
        repairCenter: centers[0]._id,
        spareParts: [
          { name: "SSD 512GB", cost: 400 },
          { name: "معجون حراري", cost: 10 },
        ],
        laborCost: 100,
        inspectionFee: 50,
        deliveryFee: 50,
        totalCost: 610,
        estimatedDays: 3,
        notes: "عرض سعر لاستبدال القرص الصلب",
        status: "approved",
      },
      {
        order: orders[2]._id, // at_center order
        repairCenter: centers[0]._id,
        spareParts: [{ name: "تنظيف النظام", cost: 0 }],
        laborCost: 80,
        inspectionFee: 50,
        deliveryFee: 30,
        totalCost: 160,
        estimatedDays: 1,
        notes: "عرض سعر لتحسين الأداء",
        status: "pending",
      },
    ]);
    console.log("✅ 3 Price Offers created");

    console.log("\n✅ Database seeding completed successfully!");
    console.log("\n📋 Sample Credentials:");
    console.log("Admin: 966501234567 / Admin@123456");
    console.log("Client 1: 966501234568 / Client@123456");
    console.log("Delegate 1: 966501234570 / Delegate@123456");
    console.log("Center 1: 966501234572 / Center@123456");
  } catch (error) {
    console.error("❌ Seeding Error:", error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log("\n🔌 Database disconnected");
  }
};

// Run seeding
connectDB().then(() => seedDatabase());
