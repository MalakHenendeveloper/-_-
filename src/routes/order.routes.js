const express = require("express");
const router = express.Router();
const orderController = require("../controllers/order.controller");
const priceOfferController = require("../controllers/priceOffer.controller");
const protect = require("../middleware/auth.middleware");
const upload = require("../middleware/upload.middleware");

// All order routes require authentication
router.use(protect);

router.post("/", upload.array("images", 5), orderController.createOrder);
router.get("/", orderController.getClientOrders);
router.get("/:id/status-history", orderController.getOrderStatusHistory);
router.get("/:id", orderController.getOrderById);
router.put("/:id/cancel", orderController.cancelOrder);
router.put("/:id/approve-offer", priceOfferController.approveOffer);
router.put("/:id/reject-offer", priceOfferController.rejectOffer);
router.put("/:id/rate", orderController.rateOrder);
router.get("/:id/tracking", orderController.getOrderTracking);

module.exports = router;
