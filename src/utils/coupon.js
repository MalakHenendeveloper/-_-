const Coupon = require("../models/Coupon");
const CouponUsage = require("../models/CouponUsage");

const MAX_USES_PER_USER = 3;

const couponError = (message, statusCode = 400) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
};

async function getValidCoupon({ code, userId, orderId, session } = {}) {
  const normalizedCode = String(code || "").trim().toUpperCase();
  if (!normalizedCode) throw couponError("Coupon code is required");

  const coupon = await Coupon.findOne({ code: normalizedCode }).session(session || null);
  if (!coupon) throw couponError("Coupon not found", 404);
  if (!coupon.isActive) throw couponError("Coupon is inactive");
  if (coupon.expiresAt <= new Date()) throw couponError("Coupon has expired");

  const usageFilter = { coupon: coupon._id, user: userId, status: "active" };
  const activeUses = await CouponUsage.countDocuments(usageFilter).session(session || null);
  if (activeUses >= MAX_USES_PER_USER) throw couponError("Coupon usage limit reached");

  if (orderId) {
    const usedForOrder = await CouponUsage.exists({ coupon: coupon._id, user: userId, order: orderId }).session(session || null);
    if (usedForOrder) throw couponError("Coupon was already used for this order");
  }

  return { coupon, activeUses, remainingUses: MAX_USES_PER_USER - activeUses };
}

function calculateCouponDiscount(coupon, amount) {
  // The agreed behaviour permits a negative resulting total.
  return Number(coupon.discountValue || 0);
}

module.exports = { MAX_USES_PER_USER, getValidCoupon, calculateCouponDiscount, couponError };
