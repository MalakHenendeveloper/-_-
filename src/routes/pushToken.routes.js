const express = require("express");
const router = express.Router();
const delegateController = require("../controllers/delegate.controller");
const protect = require("../middleware/auth.middleware");
const authorize = require("../middleware/role.middleware");

router.use(protect);
router.use(authorize("client", "delegate", "center", "admin"));

router.post("/", delegateController.registerPushToken);
router.delete("/", delegateController.removePushToken);

module.exports = router;
