const express = require("express");
const router = express.Router();
const authController = require("../controllers/auth.controller");
const protect = require("../middleware/auth.middleware");
const upload = require("../middleware/upload.middleware");
// Public routes
router.post("/register", authController.register);
router.post(
  "/register-delegate",
  //   upload.fields([
  //     { name: "nationalIdFront", maxCount: 1 },
  //     { name: "nationalIdBack", maxCount: 1 },
  //     { name: "drivingLicense", maxCount: 1 },
  //     { name: "motorcycleLicense", maxCount: 1 },
  //   ]),
  authController.registerDelegate,
);
router.post("/login", authController.login);
router.post("/delegate/login", authController.delegateLogin);
router.post("/refresh-token", authController.refreshToken);
router.post("/send-otp", authController.sendOtp);
router.post("/verify-otp", authController.verifyOtp);
router.post("/forgot-password", authController.forgotPassword);
router.post("/reset-password", authController.resetPassword);

// Auth-only routes
router.post("/logout", protect, authController.logout);

module.exports = router;
