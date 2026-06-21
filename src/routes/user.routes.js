const express = require("express");
const router = express.Router();
const userController = require("../controllers/user.controller");
const protect = require("../middleware/auth.middleware");
const upload = require("../middleware/upload.middleware");

// All user routes require authentication
router.use(protect);

router.get("/profile", userController.getProfile);
router.put("/profile", userController.updateProfile);
router.put("/avatar", upload.single("avatar"), userController.updateAvatar);
router.put("/change-password", userController.changePassword);

router.get("/addresses", userController.getAddresses);
router.post("/addresses", userController.addAddress);
router.put("/addresses/:id", userController.updateAddress);
router.delete("/addresses/:id", userController.deleteAddress);

module.exports = router;
