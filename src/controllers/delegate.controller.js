const Joi = require("joi");
const Order = require("../models/Order");
//const OTP = require("../models/OTP");
const User = require("../models/User");
// const generateOTP = require("../utils/generateOTP");
// const sendSMS = require("../utils/sendSMS");
const validate = require("../utils/validator");
const ApiResponse = require("../utils/apiResponse");
const Settlement = require("../models/Settlement");

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

const ACTIVE_ORDER_STATUSES = [
  "delegate_assigned",
  "picked_up",
  "at_center",
  "inspecting",
  "awaiting_approval",
  "approved",
  "repairing",
  "repaired",
  "returning",
];

exports.getDashboard = async (req, res, next) => {
  try {
    const delegateId = req.user.id;

    const [
      settlements,
      orders,
      totalSettlements,
      pendingSettlements,
      paidSettlements,
    ] = await Promise.all([
      Settlement.find({ recipient: delegateId, recipientType: "delegate" })
        .sort({ createdAt: -1 })
        .limit(5),
      Order.find({ delegate: delegateId })
        .populate("client", "name phone")
        .populate("repairCenter", "name")
        .sort({ createdAt: -1 })
        .limit(5),
      Settlement.aggregate([
        {
          $match: { recipient: delegateId, recipientType: "delegate" },
        },
        {
          $group: {
            _id: null,
            total: { $sum: "$amount" },
          },
        },
      ]),
      Settlement.aggregate([
        {
          $match: {
            recipient: delegateId,
            recipientType: "delegate",
            $or: [{ paymentStatus: "pending" }, { status: "pending" }],
          },
        },
        {
          $group: {
            _id: null,
            total: { $sum: "$amount" },
          },
        },
      ]),
      Settlement.aggregate([
        {
          $match: {
            recipient: delegateId,
            recipientType: "delegate",
            $or: [{ paymentStatus: "paid" }, { status: "paid" }],
          },
        },
        {
          $group: {
            _id: null,
            total: { $sum: "$amount" },
          },
        },
      ]),
    ]);

    const totalEarnings = totalSettlements[0]?.total || 0;
    const pendingEarnings = pendingSettlements[0]?.total || 0;
    const paidEarnings = paidSettlements[0]?.total || 0;
    const completedOrdersCount = await Order.countDocuments({
      delegate: delegateId,
      status: "delivered",
    });
    const activeOrdersCount = await Order.countDocuments({
      delegate: delegateId,
      status: { $in: ACTIVE_ORDER_STATUSES },
    });

    return ApiResponse.success(res, "ملخص لوحة مندوب الاستلام والتسليم", {
      summary: {
        totalEarnings,
        pendingEarnings,
        paidEarnings,
        completedOrdersCount,
        activeOrdersCount,
      },
      recentSettlements: settlements,
      recentOrders: orders,
    });
  } catch (error) {
    next(error);
  }
};

exports.getSettlements = async (req, res, next) => {
  try {
    const {
      page = 1,
      limit = 10,
      status,
      dateFrom,
      dateTo,
      sort = "newest",
    } = req.query;
    const pageNum = Math.max(1, parseInt(page) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit) || 10));
    const skip = (pageNum - 1) * limitNum;

    const filter = {
      recipient: req.user.id,
      recipientType: "delegate",
    };

    if (status && ["pending", "paid"].includes(status)) {
      filter.$or = [{ paymentStatus: status }, { status }];
    }

    if (dateFrom || dateTo) {
      filter.createdAt = {};
      if (dateFrom) filter.createdAt.$gte = new Date(dateFrom);
      if (dateTo) {
        const endDate = new Date(dateTo);
        endDate.setHours(23, 59, 59, 999);
        filter.createdAt.$lte = endDate;
      }
    }

    const [total, settlements] = await Promise.all([
      Settlement.countDocuments(filter),
      Settlement.find(filter)
        .populate("order", "orderNumber status")
        .sort(sort === "oldest" ? { createdAt: 1 } : { createdAt: -1 })
        .skip(skip)
        .limit(limitNum),
    ]);

    return ApiResponse.success(
      res,
      "قائمة تسويات المندوب",
      { settlements },
      200,
      {
        total,
        page: pageNum,
        limit: limitNum,
        pages: Math.ceil(total / limitNum),
      },
    );
  } catch (error) {
    next(error);
  }
};

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

// GET /orders/available-pickup

exports.getAvailablePickupOrders = async (req, res, next) => {
  try {
    const orders = await Order.find({
      status: "pending",
      $or: [{ delegate: null }, { delegate: { $exists: false } }],
    })
      .populate("client", "name phone")
      .sort({ createdAt: -1 });

    return ApiResponse.success(res, "الطلبات المتاحة للاستلام", {
      orders,
    });
  } catch (error) {
    next(error);
  }
};
// PUT /orders/:orderId/accept-pickup
exports.acceptPickupOrder = async (req, res, next) => {
  try {
    const order = await Order.findOneAndUpdate(
      {
        _id: req.params.orderId,
        status: "pending",
        $or: [{ delegate: null }, { delegate: { $exists: false } }],
      },
      {
        $set: {
          delegate: req.user.id,
          status: "delegate_assigned",
        },
        $push: {
          statusHistory: {
            status: "delegate_assigned",
            note: `تم قبول المهمة بواسطة المندوب ${req.user.name}`,
            updatedBy: req.user.id,
          },
        },
      },
      {
        new: true,
      },
    );

    if (!order) {
      const err = new Error("الطلب غير متاح أو تم استلامه بواسطة مندوب آخر");
      err.statusCode = 404;
      return next(err);
    }

    return ApiResponse.success(res, "تم قبول المهمة بنجاح", {
      order,
    });
  } catch (error) {
    next(error);
  }
};
// GET /orders/available-delivery
exports.getAvailableDeliveryOrders = async (req, res, next) => {
  try {
    const orders = await Order.find({
      status: "repaired",
      $or: [{ delegate: null }, { delegate: { $exists: false } }],
    })
      .populate("client", "name phone")
      .populate("repairCenter", "name phone address")
      .sort({ updatedAt: -1 });

    return ApiResponse.success(res, "الطلبات الجاهزة للتوصيل", {
      orders,
    });
  } catch (error) {
    next(error);
  }
};
// PUT /orders/:orderId/accept-delivery
exports.acceptDeliveryOrder = async (req, res, next) => {
  try {
    const order = await Order.findOneAndUpdate(
      {
        _id: req.params.orderId,
        status: "repaired",
        $or: [{ delegate: null }, { delegate: { $exists: false } }],
      },
      {
        $set: {
          delegate: req.user.id,
          status: "returning",
        },
        $push: {
          statusHistory: {
            status: "returning",
            note: `تم قبول مهمة توصيل الجهاز بواسطة المندوب ${req.user.name}`,
            updatedBy: req.user.id,
          },
        },
      },
      {
        new: true,
      },
    );

    if (!order) {
      const err = new Error("الطلب غير متاح أو تم استلامه بواسطة مندوب آخر");
      err.statusCode = 404;
      return next(err);
    }

    return ApiResponse.success(res, "تم قبول مهمة التوصيل بنجاح", {
      order,
    });
  } catch (error) {
    next(error);
  }
};

// PUT /tasks/:orderId/reject
exports.rejectTask = async (req, res, next) => {
  try {
    const order = await getDelegateOrder(req.params.orderId, req.user.id, next);

    if (!order) return;

    // إزالة المندوب من الطلب
    order.delegate = undefined;

    // لو المهمة كانت استلام من العميل
    if (order.status === "delegate_assigned") {
      order.status = "pending";

      order.statusHistory.push({
        status: "pending",
        note: "اعتذر المندوب عن استلام الجهاز، وأصبحت المهمة متاحة لمندوب آخر",
        updatedBy: req.user.id,
      });
    }

    // لو المهمة كانت توصيل الجهاز بعد الإصلاح
    else if (order.status === "returning") {
      order.status = "repaired";

      order.statusHistory.push({
        status: "repaired",
        note: "اعتذر المندوب عن توصيل الجهاز، وأصبحت المهمة متاحة لمندوب آخر",
        updatedBy: req.user.id,
      });
    } else {
      const err = new Error("لا يمكن رفض هذه المهمة في حالتها الحالية");
      err.statusCode = 400;
      return next(err);
    }

    await order.save();

    return ApiResponse.success(res, "تم إلغاء المهمة وأصبحت متاحة لمندوب آخر", {
      order,
    });
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
// exports.verifyPickupOtp = async (req, res, next) => {
//   try {
//     const schema = Joi.object({ code: Joi.string().required() });
//     const { code } = validate(schema, req.body);

//     const order = await getDelegateOrder(req.params.orderId, req.user.id, next);
//     if (!order) return;

//     // Verify OTP from OTP collection (pickup_confirm type linked to client phone)
//     const clientPhone = order.client.phone;
//     const otp = await OTP.findOne({
//       phone: clientPhone,
//       code,
//       type: "pickup_confirm",
//       expiresAt: { $gt: new Date() },
//       isUsed: false,
//     });

//     if (!otp) {
//       const err = new Error("رمز التحقق غير صحيح أو منتهي الصلاحية");
//       err.statusCode = 400;
//       return next(err);
//     }

//     otp.isUsed = true;
//     await otp.save();

//     order.pickupOTP.verified = true;
//     if (order.status !== "picked_up") {
//       order.status = "picked_up";
//       order.statusHistory.push({
//         status: "picked_up",
//         note: "تم تأكيد استلام الجهاز من العميل",
//         updatedBy: req.user.id,
//       });
//     }

//     await order.save();

//     return ApiResponse.success(res, "تم التحقق من رمز الاستلام بنجاح");
//   } catch (error) {
//     next(error);
//   }
// };

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

    order.status = "picked_up";

    order.statusHistory.push({
      status: "picked_up",
      note: "تم استلام الجهاز من العميل",
      updatedBy: req.user.id,
    });

    await order.save();

    return ApiResponse.success(res, "تم تأكيد استلام الجهاز بنجاح", { order });
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
// exports.verifyDeliveryOtp = async (req, res, next) => {
//   try {
//     const schema = Joi.object({ code: Joi.string().required() });
//     const { code } = validate(schema, req.body);

//     const order = await getDelegateOrder(req.params.orderId, req.user.id, next);
//     if (!order) return;

//     const clientPhone = order.client.phone;
//     const otp = await OTP.findOne({
//       phone: clientPhone,
//       code,
//       type: "delivery_confirm",
//       expiresAt: { $gt: new Date() },
//       isUsed: false,
//     });

//     if (!otp) {
//       const err = new Error("رمز التحقق غير صحيح أو منتهي الصلاحية");
//       err.statusCode = 400;
//       return next(err);
//     }

//     otp.isUsed = true;
//     await otp.save();

//     order.deliveryOTP.verified = true;
//     order.status = "delivered";
//     order.paymentStatus = "paid";
//     order.statusHistory.push({
//       status: "delivered",
//       note: "تم التحقق من رمز التسليم، وتم تسليم الجهاز للعميل",
//       updatedBy: req.user.id,
//     });
//     await order.save();

//     return ApiResponse.success(res, "تم التحقق من رمز التسليم بنجاح");
//   } catch (error) {
//     next(error);
//   }
// };

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

    order.status = "delivered";

    order.statusHistory.push({
      status: "delivered",
      note: "تم تسليم الجهاز للعميل",
      updatedBy: req.user.id,
    });

    await order.save();

    return ApiResponse.success(res, "تم تسليم الجهاز بنجاح", { order });
  } catch (error) {
    next(error);
  }
};
