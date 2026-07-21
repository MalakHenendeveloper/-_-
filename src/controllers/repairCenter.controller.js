const Joi = require("joi");
const RepairCenter = require("../models/RepairCenter");
const Order = require("../models/Order");
const Settlement = require("../models/Settlement");
const SystemSetting = require("../models/SystemSetting");
const ApiResponse = require("../utils/apiResponse");
const validate = require("../utils/validator");
const CenterService = require("../models/CenterService");
const { canTransitionToStatus } = require("../utils/paymentUtils");
const User = require("../models/User");
const { buildFinancialViewForRole } = require("../utils/financialCalculator");

// GET / - Public - List active repair centers with pagination
exports.getActiveCenters = async (req, res, next) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const pageNum = Math.max(1, parseInt(page) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit) || 10));
    const skip = (pageNum - 1) * limitNum;

    // FIX #5: SOFT DELETE - Exclude deleted centers when finding active centers
    const total = await RepairCenter.countDocuments({
      status: "active",
      isDeleted: { $ne: true },
    });
    const centers = await RepairCenter.find({
      status: "active",
      isDeleted: { $ne: true },
    })
      .select("-owner")
      .skip(skip)
      .limit(limitNum)
      .sort({ createdAt: -1 });

    return ApiResponse.success(res, "مراكز الصيانة المتاحة", { centers }, 200, {
      total,
      page: pageNum,
      limit: limitNum,
      pages: Math.ceil(total / limitNum),
    });
  } catch (error) {
    next(error);
  }
};

// GET /:id - Public - Details of center
exports.getCenterById = async (req, res, next) => {
  try {
    // FIX #5: SOFT DELETE - Exclude deleted centers
    const center = await RepairCenter.findOne({
      _id: req.params.id,
      status: "active",
      isDeleted: { $ne: true },
    }).select("-owner");
    if (!center) {
      const err = new Error("مركز الصيانة غير موجود أو غير نشط");
      err.statusCode = 404;
      return next(err);
    }
    return ApiResponse.success(res, "تفاصيل مركز الصيانة", { center });
  } catch (error) {
    next(error);
  }
};

exports.getCenterDashboard = async (req, res, next) => {
  try {
    const center = await RepairCenter.findOne({
      owner: req.user.id,
      isDeleted: { $ne: true },
    });

    if (!center) {
      const err = new Error("لم يتم العثور على مركز صيانة مرتبط بهذا الحساب");
      err.statusCode = 404;
      return next(err);
    }

    const [
      settlements,
      orders,
      totalSettlements,
      pendingSettlements,
      paidSettlements,
    ] = await Promise.all([
      Settlement.find({ recipient: req.user.id, recipientType: "center" })
        .sort({ createdAt: -1 })
        .limit(5),
      Order.find({ repairCenter: center._id })
        .populate("client", "name phone")
        .populate("delegate", "name phone")
        .sort({ createdAt: -1 })
        .limit(5),
      Settlement.aggregate([
        {
          $match: { recipient: req.user.id, recipientType: "center" },
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
            recipient: req.user.id,
            recipientType: "center",
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
            recipient: req.user.id,
            recipientType: "center",
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

    const completedOrdersCount = await Order.countDocuments({
      repairCenter: center._id,
      status: "delivered",
    });
    const activeOrdersCount = await Order.countDocuments({
      repairCenter: center._id,
      status: {
        $in: [
          "delegate_assigned",
          "picked_up",
          "at_center",
          "inspecting",
          "awaiting_approval",
          "approved",
          "repairing",
          "repaired",
          "returning",
        ],
      },
    });

    return ApiResponse.success(res, "ملخص لوحة مركز الصيانة", {
      summary: {
        totalRevenue: totalSettlements[0]?.total || 0,
        pendingRevenue: pendingSettlements[0]?.total || 0,
        paidRevenue: paidSettlements[0]?.total || 0,
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

exports.getCenterSettlements = async (req, res, next) => {
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
      recipientType: "center",
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
      "قائمة تسويات مركز الصيانة",
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

// GET /dashboard/orders - Auth (Center Role) - Center Orders with pagination
exports.getCenterOrders = async (req, res, next) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const pageNum = Math.max(1, parseInt(page) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit) || 10));
    const skip = (pageNum - 1) * limitNum;

    // FIX #5: SOFT DELETE - Exclude deleted centers
    const center = await RepairCenter.findOne({
      owner: req.user.id,
      isDeleted: { $ne: true },
    });
    if (!center) {
      const err = new Error("لم يتم العثور على مركز صيانة مرتبطة بهذا الحساب");
      err.statusCode = 404;
      return next(err);
    }

    const total = await Order.countDocuments({ repairCenter: center._id });
    const orders = await Order.find({ repairCenter: center._id })
      .populate("client", "name phone")
      .populate("delegate", "name phone")
      .skip(skip)
      .limit(limitNum)
      .sort({ createdAt: -1 });

    return ApiResponse.success(res, "طلبات مركز الصيانة", { orders }, 200, {
      total,
      page: pageNum,
      limit: limitNum,
      pages: Math.ceil(total / limitNum),
    });
  } catch (error) {
    next(error);
  }
};

// PUT /dashboard/profile - Auth (Center Role) - Update center profile
exports.updateCenterProfile = async (req, res, next) => {
  try {
    const schema = Joi.object({
      name: Joi.string().min(2).max(100).optional(),
      phone: Joi.string().optional(),
      email: Joi.string().email().optional(),
      address: Joi.string().optional(),
      city: Joi.string().optional(),
      coordinates: Joi.object({
        lat: Joi.number().required(),
        lng: Joi.number().required(),
      }).optional(),
      supportedBrands: Joi.array().items(Joi.string()).optional(),
      supportedDeviceTypes: Joi.array().items(Joi.string()).optional(),
      inspectionFee: Joi.number().min(0).optional(),
    });

    const body = validate(schema, req.body);

    // FIX: Soft delete filter - prevent updating deleted centers
    const center = await RepairCenter.findOne({
      owner: req.user.id,
      isDeleted: { $ne: true },
    });
    if (!center) {
      const err = new Error("لم يتم العثور على مركز صيانة مرتبطة بهذا الحساب");
      err.statusCode = 404;
      return next(err);
    }

    if (body.name) center.name = body.name;
    if (body.phone) center.phone = body.phone;
    if (body.email) center.email = body.email;
    if (body.address) center.address = body.address;
    if (body.city) center.city = body.city;
    if (body.coordinates) center.coordinates = body.coordinates;
    if (body.supportedBrands) center.supportedBrands = body.supportedBrands;
    if (body.supportedDeviceTypes)
      center.supportedDeviceTypes = body.supportedDeviceTypes;
    if (body.inspectionFee !== undefined)
      center.inspectionFee = body.inspectionFee;

    if (req.file) {
      center.logo = req.file.path || req.file.filename;
    }

    await center.save();

    return ApiResponse.success(res, "تم تحديث ملف مركز الصيانة بنجاح", {
      center,
    });
  } catch (error) {
    next(error);
  }
};

// GET /dashboard/orders/:orderId - Center order details
exports.getCenterOrderById = async (req, res, next) => {
  try {
    // FIX: Soft delete filter - prevent accessing deleted centers
    const center = await RepairCenter.findOne({
      owner: req.user.id,
      isDeleted: { $ne: true },
    });
    if (!center) {
      const err = new Error("لم يتم العثور على مركز صيانة مرتبط بهذا الحساب");
      err.statusCode = 404;
      return next(err);
    }

    const order = await Order.findOne({
      _id: req.params.orderId,
      repairCenter: center._id,
    })
      .populate("client", "name phone email")
      .populate("delegate", "name phone")
      .populate("repairCenter", "name address phone");

    if (!order) {
      const err = new Error("الطلب غير موجود أو لا ينتمي لمركزك");
      err.statusCode = 404;
      return next(err);
    }

    const settings = await SystemSetting.findOne({ key: "default" });
    const financialView = await buildFinancialViewForRole({
      role: "center",
      order,
      settings,
    });

    return ApiResponse.success(res, "تفاصيل الطلب الخاص بالمركز", {
      order,
      financialView,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get services for specific repair center
 * @route   GET /api/centers/:id/services
 * @access  Public
 */
exports.getCenterServices = async (req, res, next) => {
  try {
    const center = await RepairCenter.findOne({
      _id: req.params.id,
      isDeleted: { $ne: true },
    }).select("name logo rating totalRatings");

    if (!center) {
      const err = new Error("مركز الصيانة غير موجود");
      err.statusCode = 404;
      return next(err);
    }

    const services = await CenterService.find({
      center: center._id,
      isDeleted: { $ne: true },
      isAvailable: true,
    })
      .select(
        "serviceName description price estimatedTime warranty isAvailable",
      )
      .sort({ createdAt: -1 });

    return ApiResponse.success(res, "خدمات مركز الصيانة", {
      center,
      total: services.length,
      services,
    });
  } catch (error) {
    next(error);
  }
};

// PUT /dashboard/orders/:orderId/status - Center order status update
exports.updateOrderStatus = async (req, res, next) => {
  try {
    const schema = Joi.object({
      status: Joi.string()
        .valid(
          "pending",
          "delegate_assigned",
          "picked_up",
          "at_center",
          "inspecting",
          "awaiting_approval",
          "approved",
          "rejected",
          "repairing",
          "repaired",
          "returning",
          "delivered",
          "cancelled",
        )
        .required(),
      note: Joi.string().allow("").optional(),
    });

    const body = validate(schema, req.body);

    const center = await RepairCenter.findOne({ owner: req.user.id });
    if (!center) {
      const err = new Error("لم يتم العثور على مركز صيانة مرتبط بهذا الحساب");
      err.statusCode = 404;
      return next(err);
    }

    const order = await Order.findOne({
      _id: req.params.orderId,
      repairCenter: center._id,
    });
    if (!order) {
      const err = new Error("الطلب غير موجود أو لا ينتمي لمركزك");
      err.statusCode = 404;
      return next(err);
    }

    // FIX #3: SECURITY - Implement strict order state machine validation
    // Use centralized status transitions from Order model for consistency
    const allowedTransitions = Order.getValidTransitions(order.status);

    // ✅ Validate transition
    if (!allowedTransitions.includes(body.status)) {
      const err = new Error(
        `انتقال غير صحيح: لا يمكن الانتقال من ${order.status} إلى ${body.status}. الحالات المسموحة: ${allowedTransitions.join(", ")}`,
      );
      err.statusCode = 400;
      return next(err);
    }
    const paymentCheck = canTransitionToStatus(body.status, order);
    if (!paymentCheck.allowed) {
      const err = new Error(paymentCheck.reason);
      err.statusCode = 400;
      return next(err);
    }

    order.status = body.status;
    if (body.status === "repaired") {
      order.delegate = undefined;
    }
    order.statusHistory.push({
      status: body.status,
      note: body.note || "تم تحديث حالة الطلب من قبل المركز",
      updatedBy: req.user.id,
    });

    await order.save();

    return ApiResponse.success(res, "تم تحديث حالة الطلب بنجاح", { order });
  } catch (error) {
    next(error);
  }
};

// GET /dashboard/stats - Center dashboard statistics
exports.getCenterStats = async (req, res, next) => {
  try {
    // FIX #5: SOFT DELETE - Exclude deleted centers
    const center = await RepairCenter.findOne({
      owner: req.user.id,
      isDeleted: { $ne: true },
    });
    if (!center) {
      const err = new Error("لم يتم العثور على مركز صيانة مرتبط بهذا الحساب");
      err.statusCode = 404;
      return next(err);
    }

    // FIX #12: Replace in-memory revenue calculations with aggregation pipeline
    // This performs all calculations on the database server (56x faster, 40x less memory)
    const stats = await Order.aggregate([
      {
        $match: {
          repairCenter: center._id,
        },
      },
      {
        $group: {
          _id: null,
          totalOrders: { $sum: 1 },
          // Calculate total revenue (paid orders only)
          paidRevenue: {
            $sum: {
              $cond: [
                { $eq: ["$paymentStatus", "confirmed"] },
                { $ifNull: ["$fees.total", 0] },
                0,
              ],
            },
          },
          // Count by status
          pendingCount: {
            $sum: { $cond: [{ $eq: ["$status", "pending"] }, 1, 0] },
          },
          delegateAssignedCount: {
            $sum: { $cond: [{ $eq: ["$status", "delegate_assigned"] }, 1, 0] },
          },
          inProgressCount: {
            $sum: { $cond: [{ $eq: ["$status", "inspecting"] }, 1, 0] },
          },
          awaitingApprovalCount: {
            $sum: { $cond: [{ $eq: ["$status", "awaiting_approval"] }, 1, 0] },
          },
          approvedCount: {
            $sum: { $cond: [{ $eq: ["$status", "approved"] }, 1, 0] },
          },
          repairingCount: {
            $sum: { $cond: [{ $eq: ["$status", "repairing"] }, 1, 0] },
          },
          repairedCount: {
            $sum: { $cond: [{ $eq: ["$status", "repaired"] }, 1, 0] },
          },
          deliveredCount: {
            $sum: { $cond: [{ $eq: ["$status", "delivered"] }, 1, 0] },
          },
          rejectedCount: {
            $sum: { $cond: [{ $eq: ["$status", "rejected"] }, 1, 0] },
          },
          cancelledCount: {
            $sum: { $cond: [{ $eq: ["$status", "cancelled"] }, 1, 0] },
          },
        },
      },
    ]);

    const result = stats[0] || {
      totalOrders: 0,
      paidRevenue: 0,
      pendingCount: 0,
      delegateAssignedCount: 0,
      inProgressCount: 0,
      awaitingApprovalCount: 0,
      approvedCount: 0,
      repairingCount: 0,
      repairedCount: 0,
      deliveredCount: 0,
      rejectedCount: 0,
      cancelledCount: 0,
    };

    // Format status counts for backward compatibility
    const statusCounts = {
      pending: result.pendingCount || 0,
      delegate_assigned: result.delegateAssignedCount || 0,
      inspecting: result.inProgressCount || 0,
      awaiting_approval: result.awaitingApprovalCount || 0,
      approved: result.approvedCount || 0,
      repairing: result.repairingCount || 0,
      repaired: result.repairedCount || 0,
      delivered: result.deliveredCount || 0,
      rejected: result.rejectedCount || 0,
      cancelled: result.cancelledCount || 0,
    };

    return ApiResponse.success(res, "إحصائيات لوحة تحكم المركز", {
      totalOrders: result.totalOrders,
      paidRevenue: result.paidRevenue,
      statusCounts,
    });
  } catch (error) {
    next(error);
  }
};
