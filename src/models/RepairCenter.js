const mongoose = require("mongoose");

const RepairCenterSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Repair center name is required"],
      trim: true,
    },
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Owner reference is required"],
    },
    phone: {
      type: String,
      required: [true, "Phone number is required"],
      trim: true,
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
    },
    address: {
      type: String,
      required: [true, "Address is required"],
    },
    city: {
      type: String,
      trim: true,
    },
    coordinates: {
      lat: { type: Number },
      lng: { type: Number },
    },
    logo: {
      type: String, // Cloudinary URL or local file path
    },
    status: {
      type: String,
      enum: ["pending", "active", "suspended"],
      default: "pending",
    },
    supportedBrands: {
      type: [String],
      default: [],
    },
    supportedDeviceTypes: {
      type: [String],
      default: [],
    },
    inspectionFee: {
      type: Number,
      default: 0,
    },
    rating: {
      type: Number,
      default: 0,
    },
    totalRatings: {
      type: Number,
      default: 0,
    },
    // FIX #5: SOFT DELETE - Enable data recovery
    isDeleted: { type: Boolean, default: false },
    deletedAt: { type: Date, default: null },
  },
  {
    timestamps: true,
  },
);

// Indexes for performance
RepairCenterSchema.index({ owner: 1 });
RepairCenterSchema.index({ status: 1 });
RepairCenterSchema.index({ city: 1 });
RepairCenterSchema.index({ createdAt: -1 });
// FIX #5: SOFT DELETE - Add indexes for soft delete queries
RepairCenterSchema.index({ isDeleted: 1 });
RepairCenterSchema.index({ deletedAt: 1 });

module.exports = mongoose.model("RepairCenter", RepairCenterSchema);
