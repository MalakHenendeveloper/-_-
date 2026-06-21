const mongoose = require("mongoose");

const InspectionSchema = new mongoose.Schema(
  {
    order: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Order",
      required: [true, "Order reference is required"],
    },
    repairCenter: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "RepairCenter",
    },
    technician: {
      type: String,
      trim: true,
    },
    findings: [
      {
        issue: { type: String },
        severity: {
          type: String,
          enum: ["minor", "major", "critical"],
        },
      },
    ],
    notes: {
      type: String,
    },
    images: {
      type: [String],
      default: [],
    },
    inspectedAt: {
      type: Date,
      default: Date.now,
    },
    // FIX #5: SOFT DELETE - Enable data recovery
    isDeleted: { type: Boolean, default: false },
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

// Indexes for performance
InspectionSchema.index({ order: 1 });
InspectionSchema.index({ repairCenter: 1 });
InspectionSchema.index({ inspectedAt: -1 });
// FIX #5: SOFT DELETE - Add indexes for soft delete queries
InspectionSchema.index({ isDeleted: 1 });
InspectionSchema.index({ deletedAt: 1 });

module.exports = mongoose.model("Inspection", InspectionSchema);
