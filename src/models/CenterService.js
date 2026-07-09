const mongoose = require("mongoose");

const CenterServiceSchema = new mongoose.Schema(
  {
    center: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "RepairCenter",
      required: [true, "Repair center is required"],
    },

    serviceName: {
      type: String,
      required: [true, "Service name is required"],
      trim: true,
    },

    description: {
      type: String,
      default: "",
      trim: true,
    },

    price: {
      type: Number,
      required: [true, "Price is required"],
      min: 0,
    },

    estimatedTime: {
      type: String,
      default: "",
      trim: true,
    },

    warranty: {
      type: String,
      default: "",
      trim: true,
    },

    isAvailable: {
      type: Boolean,
      default: true,
    },

    // Soft Delete
    isDeleted: {
      type: Boolean,
      default: false,
    },

    deletedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  },
);

// =========================
// Indexes
// =========================

CenterServiceSchema.index({ center: 1 });

CenterServiceSchema.index({ serviceName: 1 });

CenterServiceSchema.index({ isAvailable: 1 });

CenterServiceSchema.index({ isDeleted: 1 });

CenterServiceSchema.index({ createdAt: -1 });

// يمنع تكرار نفس الخدمة داخل نفس السنتر
CenterServiceSchema.index(
  {
    center: 1,
    serviceName: 1,
  },
  {
    unique: true,
  },
);

module.exports = mongoose.model("CenterService", CenterServiceSchema);
