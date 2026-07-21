const express = require("express");
const router = express.Router();
const delegateController = require("../controllers/delegate.controller");
const protect = require("../middleware/auth.middleware");
const authorize = require("../middleware/role.middleware");
const upload = require("../middleware/upload.middleware");

router.use(protect);
router.use(authorize("delegate", "admin"));

router.get("/dashboard", delegateController.getDashboard);
router.get("/settlements", delegateController.getSettlements);
router.get("/tasks", delegateController.getTasks);
router.get("/tasks/history", delegateController.getTaskHistory);
router.get(
  "/orders/available-pickup",
  delegateController.getAvailablePickupOrders,
);
router.put(
  "/orders/:orderId/accept-pickup",
  delegateController.acceptPickupOrder,
);
router.get(
  "/orders/available-delivery",
  delegateController.getAvailableDeliveryOrders,
);

router.put(
  "/orders/:orderId/accept-delivery",
  delegateController.acceptDeliveryOrder,
);
//router.put('/tasks/:orderId/accept', delegateController.acceptTask);
router.put("/tasks/:orderId/reject", delegateController.rejectTask);

router.post(
  "/tasks/:orderId/pickup-photos",
  upload.array("photos", 10),
  delegateController.uploadPickupPhotos,
);
// router.post(
//   "/tasks/:orderId/verify-pickup-otp",
//   delegateController.verifyPickupOtp,
// );
router.put("/tasks/:orderId/confirm-pickup", delegateController.confirmPickup);
router.put(
  "/tasks/:orderId/confirm-drop-center",
  upload.array("photos", 10),
  delegateController.confirmDropCenter,
);
router.put(
  "/tasks/:orderId/confirm-pickup-center",
  upload.array("photos", 10),
  delegateController.confirmPickupCenter,
);

router.post(
  "/tasks/:orderId/delivery-photos",
  upload.array("photos", 10),
  delegateController.uploadDeliveryPhotos,
);
// router.post(
//   "/tasks/:orderId/verify-delivery-otp",
//   delegateController.verifyDeliveryOtp,
// );
router.put(
  "/tasks/:orderId/confirm-delivery",
  delegateController.confirmDelivery,
);

module.exports = router;
