const express = require("express");
const router = express.Router();
const priceOfferController = require("../controllers/priceOffer.controller");
const protect = require("../middleware/auth.middleware");
const authorize = require("../middleware/role.middleware");

// All price offer routes require authentication
router.use(protect);

/**
 * @route   POST /api/price-offer
 * @desc    Create price offer for an order
 * @access  Private (repair center)
 */
router.post(
  "/",
  authorize("admin", "center"),
  priceOfferController.createPriceOffer,
);

/**
 * @route   GET /api/price-offer/:orderId
 * @desc    Get price offer for specific order
 * @access  Private (client, center, admin)
 */
router.get("/:orderId", priceOfferController.getPriceOfferByOrder);

/**
 * @route   PUT /api/price-offer/:id/approve
 * @desc    Client approves price offer
 * @access  Private (client)
 */
router.put(
  "/:id/approve",
  authorize("admin", "client"),
  priceOfferController.approveOffer,
);

/**
 * @route   PUT /api/price-offer/:id/reject
 * @desc    Client rejects price offer
 * @access  Private (client)
 */
router.put(
  "/:id/reject",
  authorize("admin", "client"),
  priceOfferController.rejectOffer,
);

/**
 * @route   DELETE /api/price-offer/:id
 * @desc    Delete price offer
 * @access  Private (repair center, admin)
 */
router.delete(
  "/:id",
  authorize("admin", "center"),
  priceOfferController.deletePriceOffer,
);

module.exports = router;
