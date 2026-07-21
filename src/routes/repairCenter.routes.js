const express = require("express");
const router = express.Router();
const repairCenterController = require("../controllers/repairCenter.controller");
const inspectionController = require("../controllers/inspection.controller");
const priceOfferController = require("../controllers/priceOffer.controller");
const protect = require("../middleware/auth.middleware");
const authorize = require("../middleware/role.middleware");
const upload = require("../middleware/upload.middleware");

// Public routes
router.get("/", repairCenterController.getActiveCenters);

// Authenticated Center-only dashboard routes
router.get(
  "/dashboard",
  protect,
  authorize("center", "admin"),
  repairCenterController.getCenterDashboard,
);
router.get(
  "/settlements",
  protect,
  authorize("center", "admin"),
  repairCenterController.getCenterSettlements,
);
router.get(
  "/dashboard/orders",
  protect,
  authorize("center", "admin"),
  repairCenterController.getCenterOrders,
);
router.get(
  "/dashboard/orders/:orderId",
  protect,
  authorize("center", "admin"),
  repairCenterController.getCenterOrderById,
);
router.put(
  "/dashboard/orders/:orderId/status",
  protect,
  authorize("center", "admin"),
  repairCenterController.updateOrderStatus,
);
router.post(
  "/dashboard/orders/:orderId/inspection",
  protect,
  authorize("center", "admin"),
  upload.array("images", 10),
  inspectionController.createInspection,
);
router.post(
  "/dashboard/orders/:orderId/price-offer",
  protect,
  authorize("center", "admin"),
  priceOfferController.createPriceOffer,
);
router.get(
  "/dashboard/stats",
  protect,
  authorize("center", "admin"),
  repairCenterController.getCenterStats,
);
router.put(
  "/dashboard/profile",
  protect,
  authorize("center", "admin"),
  upload.single("logo"),
  repairCenterController.updateCenterProfile,
);
router.get("/:id/services", repairCenterController.getCenterServices);
router.get("/:id", repairCenterController.getCenterById);

module.exports = router;
