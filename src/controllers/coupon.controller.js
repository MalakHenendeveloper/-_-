const Coupon = require("../models/Coupon");
const CouponUsage = require("../models/CouponUsage");
const ApiResponse = require("../utils/apiResponse");
const { MAX_USES_PER_USER } = require("../utils/coupon");

// GET /api/coupons/available - coupons the authenticated client can still use
exports.getAvailableCoupons = async (req, res, next) => {
  try {
    const coupons = await Coupon.find({
      isActive: true,
      expiresAt: { $gt: new Date() },
    })
      .select("code discountType discountValue expiresAt")
      .sort({ createdAt: -1 })
      .lean();

    const usageCounts = await CouponUsage.aggregate([
      {
        $match: {
          user: req.user._id,
          status: "active",
          coupon: { $in: coupons.map((coupon) => coupon._id) },
        },
      },
      { $group: { _id: "$coupon", count: { $sum: 1 } } },
    ]);
    const counts = new Map(usageCounts.map((item) => [String(item._id), item.count]));
    const availableCoupons = coupons
      .map((coupon) => ({
        id: coupon._id,
        code: coupon.code,
        discountType: coupon.discountType,
        discountValue: coupon.discountValue,
        expiresAt: coupon.expiresAt,
        remainingUses: MAX_USES_PER_USER - (counts.get(String(coupon._id)) || 0),
      }))
      .filter((coupon) => coupon.remainingUses > 0);

    return ApiResponse.success(res, "Available coupons retrieved", {
      coupons: availableCoupons,
    });
  } catch (error) {
    next(error);
  }
};
