const Joi = require("joi");
const Order = require("../models/Order");
const OTP = require("../models/OTP");
const User = require("../models/User");
const generateOTP = require("../utils/generateOTP");
const sendSMS = require("../utils/sendSMS");
const validate = require("../utils/validator");
const ApiResponse = require("../utils/apiResponse");

// Helper: assert delegate owns this order
async function getDelegateOrder(orderId, delegateId, next) {
  const order = await Order.findOne({
    _id: orderId,
    delegate: delegateId,
  }).populate("client", "name phone");
  if (!order) {
    const err = new Error("الطلب غير موجود أو غير مخصص لك");
    err.statusCode = 404;
    next(err);
    return null;
  }
  return order;
}

// GET /tasks - Current & upcoming tasks
exports.getTasks = async (req, res, next) => {
  try {
    const activeStatuses = [
      "delegate_assigned",
      "picked_up",
      "at_center",
      "repaired",
      "returning",
    ];
    const orders = await Order.find({
      delegate: req.user.id,
      status: { $in: activeStatuses },
    })
      .populate("client", "name phone")
      .populate("repairCenter", "name address phone")
      .sort({ createdAt: -1 });

    return ApiResponse.success(res, "مهامك الحالية", { orders });
  } catch (error) {
    next(error);
  }
};

// GET /tasks/history - Past tasks
exports.getTaskHistory = async (req, res, next) => {
  try {
    const doneStatuses = ["delivered", "cancelled"];
    const orders = await Order.find({
      delegate: req.user.id,
      status: { $in: doneStatuses },
    })
      .populate("client", "name phone")
      .populate("repairCenter", "name address")
      .sort({ updatedAt: -1 });

    return ApiResponse.success(res, "سجل مهامك السابقة", { orders });
  } catch (error) {
    next(error);
  }
};

// PUT /tasks/:orderId/accept
exports.acceptTask = async (req, res, next) => {
  try {
    const order = await getDelegateOrder(req.params.orderId, req.user.id, next);
    if (!order) return;

    if (order.status !== "delegate_assigned") {
      const err = new Error("لا يمكن قبول هذه المهمة في حالتها الحالية");
      err.statusCode = 400;
      return next(err);
    }

    order.statusHistory.push({
      status: "delegate_assigned",
      note: "قبل المندوب المهمة",
      updatedBy: req.user.id,
    });
    await order.save();

    return ApiResponse.success(res, "تم قبول المهمة بنجاح", { order });
  } catch (error) {
    next(error);
  }
};

// PUT /tasks/:orderId/reject
exports.rejectTask = async (req, res, next) => {
  try {
    const order = await getDelegateOrder(req.params.orderId, req.user.id, next);
    if (!order) return;

    // Remove delegate assignment, revert to pending
    order.delegate = undefined;
    order.status = "pending";
    order.statusHistory.push({
      status: "pending",
      note: "رفض المندوب المهمة، جاري إعادة التعيين",
      updatedBy: req.user.id,
    });
    await order.save();

    return ApiResponse.success(res, "تم رفض المهمة", { order });
  } catch (error) {
    next(error);
  }
};

// POST /tasks/:orderId/pickup-photos
exports.uploadPickupPhotos = async (req, res, next) => {
  try {
    const order = await getDelegateOrder(req.params.orderId, req.user.id, next);
    if (!order) return;

    const photos = req.files ? req.files.map((f) => f.path || f.filename) : [];
    order.delegatePhotos.atPickup.push(...photos);
    await order.save();

    return ApiResponse.success(res, "تم رفع صور الاستلام بنجاح", {
      atPickup: order.delegatePhotos.atPickup,
    });
  } catch (error) {
    next(error);
  }
};

// POST /tasks/:orderId/verify-pickup-otp
// Delegate enters the OTP the client told him
exports.verifyPickupOtp = async (req, res, next) => {
  try {
    const schema = Joi.object({ code: Joi.string().required() });
    const { code } = validate(schema, req.body);

    const order = await getDelegateOrder(req.params.orderId, req.user.id, next);
    if (!order) return;

    // Verify OTP from OTP collection (pickup_confirm type linked to client phone)
    const clientPhone = order.client.phone;
    const otp = await OTP.findOne({
      phone: clientPhone,
      code,
      type: "pickup_confirm",
      expiresAt: { $gt: new Date() },
      isUsed: false,
    });

    if (!otp) {
      const err = new Error("رمز التحقق غير صحيح أو منتهي الصلاحية");
      err.statusCode = 400;
      return next(err);
    }

    otp.isUsed = true;
    await otp.save();

    order.pickupOTP.verified = true;
    if (order.status !== "picked_up") {
      order.status = "picked_up";
      order.statusHistory.push({
        status: "picked_up",
        note: "تم تأكيد استلام الجهاز من العميل",
        updatedBy: req.user.id,
      });
    }

    await order.save();

    return ApiResponse.success(res, "تم التحقق من رمز الاستلام بنجاح");
  } catch (error) {
    next(error);
  }
};

// PUT /tasks/:orderId/confirm-pickup
// Generates OTP and sends to client to confirm device pickup
exports.confirmPickup = async (req, res, next) => {
  try {
    const order = await getDelegateOrder(req.params.orderId, req.user.id, next);
    if (!order) return;

    if (order.status !== "delegate_assigned") {
      const err = new Error("لا يمكن تأكيد الاستلام في حالته الحالية");
      err.statusCode = 400;
      return next(err);
    }

    const clientPhone = order.client.phone;
    const otpCode = generateOTP();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    await OTP.deleteMany({ phone: clientPhone, type: "pickup_confirm" });
    await OTP.create({
      phone: clientPhone,
      code: otpCode,
      type: "pickup_confirm",
      expiresAt,
    });

    await sendSMS(clientPhone, `رمز تأكيد استلام جهازك هو: ${otpCode}`);

    order.pickupOTP = { code: otpCode, expiresAt, verified: false };
    order.statusHistory.push({
      status: order.status,
      note: "تم إرسال رمز التحقق للعميل لتأكيد الاستلام",
      updatedBy: req.user.id,
    });
    await order.save();

    return ApiResponse.success(res, "تم إرسال رمز التأكيد للعميل", {
      orderStatus: order.status,
    });
  } catch (error) {
    next(error);
  }
};

// PUT /tasks/:orderId/confirm-drop-center
// Delegate delivered device to repair center
exports.confirmDropCenter = async (req, res, next) => {
  try {
    const order = await getDelegateOrder(req.params.orderId, req.user.id, next);
    if (!order) return;

    const photos = req.files ? req.files.map((f) => f.path || f.filename) : [];
    order.delegatePhotos.atCenterDrop.push(...photos);
    order.status = "at_center";
    order.statusHistory.push({
      status: "at_center",
      note: "تم تسليم الجهاز لمركز الصيانة",
      updatedBy: req.user.id,
    });
    await order.save();

    return ApiResponse.success(res, "تم تأكيد التسليم للمركز", { order });
  } catch (error) {
    next(error);
  }
};

// PUT /tasks/:orderId/confirm-pickup-center
// Delegate picked up repaired device from center
exports.confirmPickupCenter = async (req, res, next) => {
  try {
    const order = await getDelegateOrder(req.params.orderId, req.user.id, next);
    if (!order) return;

    const photos = req.files ? req.files.map((f) => f.path || f.filename) : [];
    order.delegatePhotos.atCenterPickup.push(...photos);
    order.status = "returning";
    order.statusHistory.push({
      status: "returning",
      note: "تم استلام الجهاز من المركز بعد الإصلاح، في طريق التسليم للعميل",
      updatedBy: req.user.id,
    });
    await order.save();

    return ApiResponse.success(res, "تم تأكيد استلام الجهاز من المركز", {
      order,
    });
  } catch (error) {
    next(error);
  }
};

// POST /tasks/:orderId/delivery-photos
exports.uploadDeliveryPhotos = async (req, res, next) => {
  try {
    const order = await getDelegateOrder(req.params.orderId, req.user.id, next);
    if (!order) return;

    const photos = req.files ? req.files.map((f) => f.path || f.filename) : [];
    order.delegatePhotos.atDelivery.push(...photos);
    await order.save();

    return ApiResponse.success(res, "تم رفع صور التسليم بنجاح", {
      atDelivery: order.delegatePhotos.atDelivery,
    });
  } catch (error) {
    next(error);
  }
};

// POST /tasks/:orderId/verify-delivery-otp
exports.verifyDeliveryOtp = async (req, res, next) => {
  try {
    const schema = Joi.object({ code: Joi.string().required() });
    const { code } = validate(schema, req.body);

    const order = await getDelegateOrder(req.params.orderId, req.user.id, next);
    if (!order) return;

    const clientPhone = order.client.phone;
    const otp = await OTP.findOne({
      phone: clientPhone,
      code,
      type: "delivery_confirm",
      expiresAt: { $gt: new Date() },
      isUsed: false,
    });

    if (!otp) {
      const err = new Error("رمز التحقق غير صحيح أو منتهي الصلاحية");
      err.statusCode = 400;
      return next(err);
    }

    otp.isUsed = true;
    await otp.save();

    order.deliveryOTP.verified = true;
    order.status = "delivered";
    order.paymentStatus = "paid";
    order.statusHistory.push({
      status: "delivered",
      note: "تم التحقق من رمز التسليم، وتم تسليم الجهاز للعميل",
      updatedBy: req.user.id,
    });
    await order.save();

    return ApiResponse.success(res, "تم التحقق من رمز التسليم بنجاح");
  } catch (error) {
    next(error);
  }
};

// PUT /tasks/:orderId/confirm-delivery
// Generate OTP and send to client to confirm delivery
exports.confirmDelivery = async (req, res, next) => {
  try {
    const order = await getDelegateOrder(req.params.orderId, req.user.id, next);
    if (!order) return;

    if (order.status !== "returning") {
      const err = new Error("لا يمكن تأكيد التسليم في حالته الحالية");
      err.statusCode = 400;
      return next(err);
    }

    const clientPhone = order.client.phone;
    const otpCode = generateOTP();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    await OTP.deleteMany({ phone: clientPhone, type: "delivery_confirm" });
    await OTP.create({
      phone: clientPhone,
      code: otpCode,
      type: "delivery_confirm",
      expiresAt,
    });

    await sendSMS(
      clientPhone,
      `رمز تأكيد استلام جهازك المُصلَح هو: ${otpCode}`,
    );

    order.deliveryOTP = { code: otpCode, expiresAt, verified: false };
    order.statusHistory.push({
      status: order.status,
      note: "تم إرسال رمز تأكيد التسليم للعميل",
      updatedBy: req.user.id,
    });
    await order.save();

    return ApiResponse.success(res, "تم إرسال رمز التأكيد للعميل", {
      orderStatus: order.status,
    });
  } catch (error) {
    next(error);
  }
};
