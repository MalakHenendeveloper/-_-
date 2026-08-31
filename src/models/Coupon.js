const mongoose = require("mongoose");

const CouponSchema = new mongoose.Schema(
  {
    code: { type: String, required: true, unique: true, trim: true, uppercase: true },
    discountType: { type: String, enum: ["fixed"], default: "fixed", immutable: true },
    discountValue: { type: Number, required: true, min: 0.01 },
    expiresAt: { type: Date, required: true },
    isActive: { type: Boolean, default: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    // Incremented whenever a usage is created or reversed. This intentionally
    // serializes coupon redemptions inside transactions and prevents a fourth
    // concurrent redemption from bypassing the per-user limit.
    usageVersion: { type: Number, default: 0 },
  },
  { timestamps: true },
);

CouponSchema.pre("validate", function (next) {
  if (this.isNew && !this.expiresAt) {
    this.expiresAt = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000);
  }
  next();
});

module.exports = mongoose.model("Coupon", CouponSchema);
