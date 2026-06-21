const express = require("express");
const router = express.Router();
const inspectionController = require("../controllers/inspection.controller");
const protect = require("../middleware/auth.middleware");
const authorize = require("../middleware/role.middleware");
const upload = require("../middleware/upload.middleware");

// All inspection routes require authentication
router.use(protect);

/**
 * @route   POST /api/inspection
 * @desc    Create inspection report for an order
 * @access  Private (repair center)
 */
router.post(
  "/",
  authorize("admin", "center"),
  upload.array("images", 10),
  inspectionController.createInspection,
);

/**
 * @route   GET /api/inspection/:orderId
 * @desc    Get inspection report for specific order
 * @access  Private (client, center, admin)
 */
router.get("/:orderId", inspectionController.getInspectionByOrder);

/**
 * @route   PUT /api/inspection/:id
 * @desc    Update inspection report
 * @access  Private (repair center, admin)
 */
router.put(
  "/:id",
  authorize("admin", "center"),
  upload.array("images", 10),
  inspectionController.updateInspection,
);

/**
 * @route   DELETE /api/inspection/:id
 * @desc    Delete inspection report
 * @access  Private (admin only)
 */
router.delete(
  "/:id",
  authorize("admin"),
  inspectionController.deleteInspection,
);

module.exports = router;
