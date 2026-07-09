const express = require("express");
const router = express.Router();

const centerServiceController = require("../controllers/centerService.controller");
const protect = require("../middleware/auth.middleware");
const authorize = require("../middleware/role.middleware");

// All center service routes require authentication
router.use(protect);

// Only Center & Admin can manage services
router.use(authorize("center", "admin"));

/**
 * @route   POST /api/center/services
 * @desc    Create new center service
 */
router.post("/", centerServiceController.createService);

/**
 * @route   GET /api/center/services
 * @desc    Get all services for logged-in center
 */
router.get("/", centerServiceController.getCenterServices);

/**
 * @route   GET /api/center/services/:id
 * @desc    Get single service
 */
router.get("/:id", centerServiceController.getServiceById);

/**
 * @route   PUT /api/center/services/:id
 * @desc    Update service
 */
router.put("/:id", centerServiceController.updateService);

/**
 * @route   DELETE /api/center/services/:id
 * @desc    Soft delete service
 */
router.delete("/:id", centerServiceController.deleteService);

/**
 * @route   PATCH /api/center/services/:id/toggle
 * @desc    Enable / Disable service
 */
router.patch("/:id/toggle", centerServiceController.toggleAvailability);

module.exports = router;
