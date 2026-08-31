const mongoose = require("mongoose");

const CouponUsageSchema = new mongoose.Schema(
  {
    coupon: { type: mongoose.Schema.Types.ObjectId, ref: "Coupon", required: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    order: { type: mongoose.Schema.Types.ObjectId, ref: "Order", required: true },
    usageNumber: { type: Number, required: true, min: 1, max: 3 },
    status: { type: String, enum: ["active", "reversed"], default: "active" },
    usedAt: { type: Date, default: Date.now },
    reversedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

CouponUsageSchema.index({ coupon: 1, user: 1, order: 1 }, { unique: true });
CouponUsageSchema.index({ coupon: 1, user: 1, status: 1 });

module.exports = mongoose.model("CouponUsage", CouponUsageSchema);
