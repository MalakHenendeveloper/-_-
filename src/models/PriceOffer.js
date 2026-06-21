const mongoose = require("mongoose");

const PriceOfferSchema = new mongoose.Schema(
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
    spareParts: [
      {
        name: { type: String },
        cost: { type: Number },
      },
    ],
    laborCost: {
      type: Number,
      required: [true, "Labor cost is required"],
      min: 0,
    },
    inspectionFee: {
      type: Number,
      default: 0,
    },
    deliveryFee: {
      type: Number,
      default: 0,
    },
    totalCost: {
      type: Number,
      required: [true, "Total cost is required"],
      min: 0,
    },
    estimatedDays: {
      type: Number,
      min: 0,
    },
    notes: {
      type: String,
    },
    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
    },
    respondedAt: {
      type: Date,
    },
    // FIX #5: SOFT DELETE - Enable data recovery
    isDeleted: { type: Boolean, default: false },
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

// Indexes for performance
PriceOfferSchema.index({ order: 1 });
PriceOfferSchema.index({ repairCenter: 1 });
PriceOfferSchema.index({ status: 1 });
PriceOfferSchema.index({ createdAt: -1 });
// FIX #5: SOFT DELETE - Add indexes for soft delete queries
PriceOfferSchema.index({ isDeleted: 1 });
PriceOfferSchema.index({ deletedAt: 1 });

module.exports = mongoose.model("PriceOffer", PriceOfferSchema);
