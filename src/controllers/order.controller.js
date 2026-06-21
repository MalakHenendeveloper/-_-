const Joi = require("joi");
const Order = require("../models/Order");
const RepairCenter = require("../models/RepairCenter");
const validate = require("../utils/validator");
const ApiResponse = require("../utils/apiResponse");

// POST / - Create order (+ upload images)
exports.createOrder = async (req, res, next) => {
  try {
    const schema = Joi.object({
      device: Joi.object({
        type: Joi.string().required(),
        brand: Joi.string().required(),
        model: Joi.string().required(),
        problemType: Joi.string().required(),
        problemDescription: Joi.string().allow("").optional(),
      }).required(),
      pickupAddress: Joi.object({
        address: Joi.string().required(),
        city: Joi.string().required(),
        coordinates: Joi.object({
          lat: Joi.number().required(),
          lng: Joi.number().required(),
        }).optional(),
      }).required(),
      repairCenter: Joi.string().hex().length(24).optional(),
    });

    let parsedBody = { ...req.body };
    if (typeof req.body.device === "string") {
      parsedBody.device = JSON.parse(req.body.device);
    }
    if (typeof req.body.pickupAddress === "string") {
      parsedBody.pickupAddress = JSON.parse(req.body.pickupAddress);
    }

    const body = validate(schema, parsedBody);

    const images = [];
    if (req.files && req.files.length > 0) {
      req.files.forEach((file) => {
        images.push(file.path || file.filename);
      });
    }

    const deviceData = {
      ...body.device,
      images,
    };

    let inspectionFee = 0;
    if (body.repairCenter) {
      // FIX: Validate repairCenter exists before creating order
      const center = await RepairCenter.findOne({
        _id: body.repairCenter,
        isDeleted: { $ne: true },
      });
      if (!center) {
        const err = new Error("مركز الصيانة المختار غير موجود");
        err.statusCode = 404;
        return next(err);
      }
      inspectionFee = center.inspectionFee || 0;
    }

    const order = new Order({
      client: req.user.id,
      device: deviceData,
      pickupAddress: body.pickupAddress,
      repairCenter: body.repairCenter || undefined,
      fees: {
        inspection: inspectionFee,
        delivery: 0,
        repair: 0,
        total: inspectionFee,
      },
      status: "pending",
    });

    await order.save();

    return ApiResponse.success(
      res,
      "تم إنشاء طلب الصيانة بنجاح",
      { order },
      201,
    );
  } catch (error) {
    next(error);
  }
};

// GET / - Get client orders with pagination
exports.getClientOrders = async (req, res, next) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const pageNum = Math.max(1, parseInt(page) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit) || 10));
    const skip = (pageNum - 1) * limitNum;

    const total = await Order.countDocuments({ client: req.user.id });
    const orders = await Order.find({ client: req.user.id })
      .populate("repairCenter", "name address phone")
      .populate("delegate", "name phone")
      .skip(skip)
      .limit(limitNum)
      .sort({ createdAt: -1 });

    return ApiResponse.success(
      res,
      "طلبات الصيانة الخاصة بك",
      { orders },
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

// GET /:id - Details of specific order (with access control)
exports.getOrderById = async (req, res, next) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate("client", "name phone email")
      .populate("repairCenter", "name address phone owner")
      .populate("delegate", "name phone");

    if (!order) {
      const err = new Error("الطلب غير موجود");
      err.statusCode = 404;
      return next(err);
    }

    const isAdmin = req.user.role === "admin";
    const isClient = req.user.id === order.client._id.toString();
    const isDelegate =
      order.delegate && req.user.id === order.delegate._id.toString();
    const isCenterOwner =
      order.repairCenter &&
      order.repairCenter.owner &&
      req.user.id === order.repairCenter.owner.toString();

    if (!isAdmin && !isClient && !isDelegate && !isCenterOwner) {
      const err = new Error("غير مصرح لك بالوصول إلى هذا الطلب");
      err.statusCode = 403;
      return next(err);
    }

    return ApiResponse.success(res, "تفاصيل الطلب", { order });
  } catch (error) {
    next(error);
  }
};

// PUT /:id/cancel - Cancel order
exports.cancelOrder = async (req, res, next) => {
  try {
    const order = await Order.findById(req.params.id);

    if (!order) {
      const err = new Error("الطلب غير موجود");
      err.statusCode = 404;
      return next(err);
    }

    if (order.client.toString() !== req.user.id && req.user.role !== "admin") {
      const err = new Error("غير مصرح لك بإلغاء هذا الطلب");
      err.statusCode = 403;
      return next(err);
    }

    const cancellableStatuses = ["pending", "delegate_assigned"];
    if (!cancellableStatuses.includes(order.status)) {
      const err = new Error(
        "لا يمكن إلغاء الطلب بعد استلامه أو البدء في الصيانة",
      );
      err.statusCode = 400;
      return next(err);
    }

    order.status = "cancelled";
    order.statusHistory.push({
      status: "cancelled",
      note: "تم إلغاء الطلب من قبل العميل",
      updatedBy: req.user.id,
    });

    await order.save();

    return ApiResponse.success(res, "تم إلغاء الطلب بنجاح", { order });
  } catch (error) {
    next(error);
  }
};

// GET /:id/tracking - Track order status history
exports.getOrderTracking = async (req, res, next) => {
  try {
    const order = await Order.findById(req.params.id)
      .select("status statusHistory orderNumber client repairCenter delegate")
      .populate("client", "name")
      .populate("repairCenter", "owner")
      .populate("delegate", "name");

    if (!order) {
      const err = new Error("الطلب غير موجود");
      err.statusCode = 404;
      return next(err);
    }

    const isAdmin = req.user.role === "admin";
    const isClient = order.client._id.toString() === req.user.id;
    const isDelegate =
      order.delegate && req.user.id === order.delegate._id.toString();
    const isCenterOwner =
      order.repairCenter &&
      order.repairCenter.owner &&
      req.user.id === order.repairCenter.owner.toString();

    if (!isAdmin && !isClient && !isDelegate && !isCenterOwner) {
      const err = new Error("غير مصرح لك بتتبع هذا الطلب");
      err.statusCode = 403;
      return next(err);
    }

    return ApiResponse.success(res, "تتبع حالة الطلب", {
      orderNumber: order.orderNumber,
      status: order.status,
      statusHistory: order.statusHistory,
    });
  } catch (error) {
    next(error);
  }
};

// GET /:id/status-history - Order status history
exports.getOrderStatusHistory = async (req, res, next) => {
  try {
    const order = await Order.findById(req.params.id)
      .select("status statusHistory orderNumber client repairCenter delegate")
      .populate("client", "name")
      .populate("repairCenter", "owner")
      .populate("delegate", "name");

    if (!order) {
      const err = new Error("الطلب غير موجود");
      err.statusCode = 404;
      return next(err);
    }

    const isAdmin = req.user.role === "admin";
    const isClient = order.client._id.toString() === req.user.id;
    const isDelegate =
      order.delegate && req.user.id === order.delegate._id.toString();
    const isCenterOwner =
      order.repairCenter &&
      order.repairCenter.owner &&
      req.user.id === order.repairCenter.owner.toString();

    if (!isAdmin && !isClient && !isDelegate && !isCenterOwner) {
      const err = new Error("غير مصرح لك بالوصول إلى حالة الطلب");
      err.statusCode = 403;
      return next(err);
    }

    return ApiResponse.success(res, "تاريخ حالات الطلب", {
      orderNumber: order.orderNumber,
      statusHistory: order.statusHistory,
    });
  } catch (error) {
    next(error);
  }
};

// PUT /:id/rate - Rate order and service
exports.rateOrder = async (req, res, next) => {
  try {
    const schema = Joi.object({
      score: Joi.number().min(1).max(5).required(),
      comment: Joi.string().max(500).allow("").optional(),
    });

    const body = validate(schema, req.body);

    const order = await Order.findById(req.params.id);
    if (!order) {
      const err = new Error("الطلب غير موجود");
      err.statusCode = 404;
      return next(err);
    }

    // Only the client who placed the order can rate it
    if (order.client.toString() !== req.user.id) {
      const err = new Error("غير مصرح لك بتقييم هذا الطلب");
      err.statusCode = 403;
      return next(err);
    }

    // Order must be delivered to be rated
    if (order.status !== "delivered") {
      const err = new Error("يمكن تقييم الطلب فقط بعد التسليم");
      err.statusCode = 400;
      return next(err);
    }

    // Cannot rate twice
    if (order.rating && order.rating.score) {
      const err = new Error("تم تقييم هذا الطلب بالفعل");
      err.statusCode = 400;
      return next(err);
    }

    order.rating = {
      score: body.score,
      comment: body.comment || "",
      createdAt: new Date(),
    };

    await order.save();

    // Update repair center average rating
    if (order.repairCenter) {
      const center = await RepairCenter.findById(order.repairCenter);
      if (center) {
        // FIX #6: PERFORMANCE - Use MongoDB aggregation pipeline
        // instead of loading all documents. O(1) vs O(n)
        const ratingStats = await Order.aggregate([
          {
            $match: {
              repairCenter: new (require("mongoose").Types.ObjectId)(
                order.repairCenter,
              ),
              "rating.score": { $exists: true },
            },
          },
          {
            $group: {
              _id: null,
              avgRating: { $avg: "$rating.score" },
              totalRatings: { $sum: 1 },
            },
          },
        ]);

        // ✅ Update center rating from aggregation result
        if (ratingStats.length > 0) {
          center.rating = ratingStats[0].avgRating;
          center.totalRatings = ratingStats[0].totalRatings;
          await center.save();
        }
      }
    }

    return ApiResponse.success(res, "تم تسجيل التقييم بنجاح", {
      rating: order.rating,
    });
  } catch (error) {
    next(error);
  }
};
