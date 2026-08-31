const express = require("express");
const router = express.Router();
const couponController = require("../controllers/coupon.controller");
const protect = require("../middleware/auth.middleware");
const authorize = require("../middleware/role.middleware");

router.get("/available", protect, authorize("client"), couponController.getAvailableCoupons);

module.exports = router;
