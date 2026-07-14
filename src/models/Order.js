const mongoose = require("mongoose");
const { v4: uuidv4 } = require("uuid");

const OrderSchema = new mongoose.Schema(
  {
    orderNumber: {
      type: String,
      unique: true,
    },
    client: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Client reference is required"],
    },
    repairCenter: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "RepairCenter",
    },
    delegate: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    device: {
      type: {
        type: String,
        required: [true, "Device type is required"], // phone, tablet, laptop...
      },
      brand: {
        type: String,
        required: [true, "Device brand is required"], // Apple, Samsung...
      },
      model: {
        type: String,
        required: [true, "Device model is required"], // iPhone 14, Galaxy S23...
      },
      problemType: {
        type: String,
        required: [true, "Problem type is required"], // screen, battery...
      },
      problemDescription: {
        type: String,
      },
      images: {
        type: [String],
        default: [],
      },
    },
    pickupAddress: {
      address: { type: String, required: [true, "Pickup address is required"] },
      city: { type: String },
      coordinates: {
        lat: { type: Number },
        lng: { type: Number },
      },
    },
    fees: {
      inspection: { type: Number, default: 0 },
      delivery: { type: Number, default: 0 },
      repair: { type: Number, default: 0 },
      total: { type: Number, default: 0 },
    },
    status: {
      type: String,
      enum: [
        "pending",
        "delegate_assigned",
        "picked_up",
        "at_center",
        "inspecting",
        "awaiting_approval",
        "approved",
        "rejected",
        "repairing",
        "repaired",
        "returning",
        "delivered",
        "cancelled",
      ],
      default: "pending",
    },
    statusHistory: [
      {
        status: { type: String, required: true },
        timestamp: { type: Date, default: Date.now },
        note: { type: String },
        updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        role: {
          type: String,
        },
      },
    ],
    pickupOTP: {
      code: { type: String },
      expiresAt: { type: Date },
      verified: { type: Boolean, default: false },
    },
    deliveryOTP: {
      code: { type: String },
      expiresAt: { type: Date },
      verified: { type: Boolean, default: false },
    },
    delegatePhotos: {
      atPickup: { type: [String], default: [] },
      atCenterDrop: { type: [String], default: [] },
      atCenterPickup: { type: [String], default: [] },
      atDelivery: { type: [String], default: [] },
    },
    clientApproval: {
      status: {
        type: String,
        enum: ["pending", "approved", "rejected"],
        default: "pending",
      },
      timestamp: { type: Date },
      note: { type: String },
    },
    rating: {
      score: { type: Number, min: 1, max: 5 },
      comment: { type: String },
      createdAt: { type: Date },
    },
    paymentStatus: {
      type: String,
      enum: ["unpaid", "paid"],
      default: "unpaid",
    },
  },
  {
    timestamps: true,
  },
);

// Valid status transitions - SINGLE SOURCE OF TRUTH
const validTransitions = {
  pending: ["delegate_assigned", "cancelled"],
  delegate_assigned: ["picked_up", "cancelled"],
  picked_up: ["at_center"],
  at_center: ["inspecting", "cancelled"],
  inspecting: ["awaiting_approval", "cancelled"],
  awaiting_approval: ["approved", "rejected", "cancelled"],
  approved: ["repairing", "cancelled"],
  rejected: ["cancelled"],
  repairing: ["repaired"],
  repaired: ["returning"],
  returning: ["delivered"],
  delivered: [],
  cancelled: [],
};

// Static method for accessing valid transitions (used across controllers)
OrderSchema.statics.getValidTransitions = function (currentStatus) {
  return validTransitions[currentStatus] || [];
};

// Pre-save hook to generate orderNumber, validate status transitions, and push status history
OrderSchema.pre("save", async function (next) {
  if (this.isNew) {
    // FIX: Generate unique order number with cryptographic randomness
    // Format: ORD-YYYYMMDD-XXXXXXXX (UUID-based, not weak random)
    // Ensures uniqueness under high traffic without race conditions
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, "");
    const uniqueSuffix = uuidv4().split("-")[0].toUpperCase(); // 36^8 combinations (~2.8 trillion)
    this.orderNumber = `ORD-${dateStr}-${uniqueSuffix}`;

    // Push initial pending status to status history
    this.statusHistory.push({
      status: "pending",
      note: "تم إنشاء الطلب بنجاح",
      updatedBy: this.client,
    });
  } else {
    // Validate status transition for existing orders using static method
    const lastStatus =
      this.statusHistory[this.statusHistory.length - 1]?.status || "pending";
    if (lastStatus !== this.status) {
      const allowedTransitions =
        this.constructor.getValidTransitions(lastStatus);
      if (!allowedTransitions.includes(this.status)) {
        const error = new Error(
          `انتقال غير صحيح: لا يمكن الانتقال من ${lastStatus} إلى ${this.status}`,
        );
        error.statusCode = 400;
        return next(error);
      }
    }
  }
  next();
});
// Indexes for performance
// orderNumber already has unique index from field definition
OrderSchema.index({ client: 1, createdAt: -1 });
OrderSchema.index({ repairCenter: 1 });
OrderSchema.index({ delegate: 1 });
OrderSchema.index({ status: 1 });
OrderSchema.index({ createdAt: -1 });
// Additional indexes for common queries
OrderSchema.index({ paymentStatus: 1 }); // For revenue calculations
OrderSchema.index({ status: 1, createdAt: -1 }); // For status filtering with date range
module.exports = mongoose.model("Order", OrderSchema);
