const express = require("express");
const router = express.Router();
const adminController = require("../controllers/admin.controller");
const protect = require("../middleware/auth.middleware");
const authorize = require("../middleware/role.middleware");
const upload = require("../middleware/upload.middleware");
// All admin routes require authentication and admin role
router.use(protect);
router.use(authorize("admin"));

router.get("/dashboard", adminController.getDashboard);
router.get("/settlements", adminController.getSettlements);
router.get("/settlements/summary", adminController.getSettlementSummary);
router.patch("/settlements/pay", adminController.bulkPaySettlements);
router.patch("/settlements/:id/pay", adminController.paySettlement);

// Users management
router.get("/users", adminController.getUsers);
router.get("/users/:id", adminController.getUserById);
router.put("/users/:id/status", adminController.updateUserStatus);
router.delete("/users/:id", adminController.deleteUser);

// Delegate management
//router.get("/delegates", adminController.getDelegates);
//router.post("/delegates", adminController.createDelegate);
// router.put("/delegates/:id/status", adminController.updateDelegateStatus);
// router.delete("/delegates/:id", adminController.deleteDelegate);
// Delegate management
router.get("/delegates", adminController.getDelegates);

router.get("/delegate-applications", adminController.getDelegateApplications);

router.get(
  "/delegate-applications/:id",
  adminController.getDelegateApplicationById,
);

router.put(
  "/delegate-applications/:id/approve",
  adminController.approveDelegateApplication,
);

router.put(
  "/delegate-applications/:id/reject",
  adminController.rejectDelegateApplication,
);

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

// Payment settings
router.get("/payment-settings", adminController.getPaymentSettings);
router.put("/payment-settings", adminController.updatePaymentSettings);

// Financial settings
router.get("/financial-settings", adminController.getFinancialSettings);
router.put("/financial-settings", adminController.updateFinancialSettings);

// Stats
router.get("/stats/overview", adminController.getStatsOverview);
router.get("/stats/revenue", adminController.getStatsRevenue);
router.get("/stats/centers", adminController.getStatsCenters);
router.get("/stats/delegates", adminController.getStatsDelegates);
//payments
router.get("/payments", adminController.getPayments);
router.put("/payments/:paymentId/review", adminController.reviewPayment);

module.exports = router;
