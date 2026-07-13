const express = require("express");
const router = express.Router();
const adminController = require("../controllers/admin.controller");
const protect = require("../middleware/auth.middleware");
const authorize = require("../middleware/role.middleware");
const upload = require("../middleware/upload.middleware");
// All admin routes require authentication and admin role
router.use(protect);
router.use(authorize("admin"));

// Users management
router.get("/users", adminController.getUsers);
router.get("/users/:id", adminController.getUserById);
router.put("/users/:id/status", adminController.updateUserStatus);
router.delete("/users/:id", adminController.deleteUser);

// Delegate management
router.get("/delegates", adminController.getDelegates);
router.post("/delegates", adminController.createDelegate);
router.put("/delegates/:id/status", adminController.updateDelegateStatus);
router.delete("/delegates/:id", adminController.deleteDelegate);

// Repair Centers management
router.get("/centers", adminController.getCenters);
router.get("/centers/:id", adminController.getCenterById);
router.post("/centers", upload.single("logo"), adminController.createCenter);
//router.post("/centers", adminController.createCenter);
router.put("/centers/:id/status", adminController.updateCenterStatus);
router.delete("/centers/:id", adminController.deleteCenter);

// Orders management
router.get("/orders", adminController.getOrders);
router.get("/orders/:id", adminController.getOrderById);
// router.put("/orders/:id/assign-delegate", adminController.assignDelegate);

// Stats
router.get("/stats/overview", adminController.getStatsOverview);
router.get("/stats/revenue", adminController.getStatsRevenue);
router.get("/stats/centers", adminController.getStatsCenters);
router.get("/stats/delegates", adminController.getStatsDelegates);

module.exports = router;
