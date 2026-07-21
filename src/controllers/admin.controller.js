const Joi = require("joi");
const mongoose = require("mongoose");
const User = require("../models/User");
const DelegateApplication = require("../models/DelegateApplication");
const { deleteImage } = require("../config/cloudinary");
const RepairCenter = require("../models/RepairCenter");
const Order = require("../models/Order");
const SystemSetting = require("../models/SystemSetting");
const Settlement = require("../models/Settlement");
const validate = require("../utils/validator");
const ApiResponse = require("../utils/apiResponse");
const CenterService = require("../models/CenterService");
const Payment = require("../models/Payment");
const { buildFinancialViewForRole } = require("../utils/financialCalculator");

exports.getDashboard = async (req, res, next) => {
  try {
    const [orders, settlements, clients, delegates, centers, payments] =
      await Promise.all([
        Order.countDocuments(),
        Settlement.find({}).sort({ createdAt: -1 }).limit(5),
        User.countDocuments({ role: "client", isDeleted: { $ne: true } }),
        User.countDocuments({ role: "delegate", isDeleted: { $ne: true } }),
        RepairCenter.countDocuments({ isDeleted: { $ne: true } }),
        Payment.find({ status: "confirmed" }),
      ]);

    const pendingOrders = await Order.countDocuments({ status: "pending" });
    const inProgressOrders = await Order.countDocuments({
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
    const completedOrders = await Order.countDocuments({ status: "delivered" });
    const cancelledOrders = await Order.countDocuments({ status: "cancelled" });

    const totalClientPayments = payments.reduce(
      (sum, payment) => sum + (payment.amount || 0),
      0,
    );
    const totalCenterRevenue = await Settlement.aggregate([
      { $match: { recipientType: "center" } },
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ]);
    const totalDelegateEarnings = await Settlement.aggregate([
      { $match: { recipientType: "delegate" } },
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ]);
    const totalAdminCommission = await Settlement.aggregate([
      { $match: { recipientType: "admin" } },
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ]);
    const pendingSettlements = await Settlement.aggregate([
      {
        $match: { $or: [{ paymentStatus: "pending" }, { status: "pending" }] },
      },
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ]);
    const paidSettlements = await Settlement.aggregate([
      { $match: { $or: [{ paymentStatus: "paid" }, { status: "paid" }] } },
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ]);

    const recentOrders = await Order.find({})
      .populate("client", "name")
      .populate("repairCenter", "name")
      .sort({ createdAt: -1 })
      .limit(5);

    return ApiResponse.success(res, "لوحة إحصائيات الإدارة", {
      orders: {
        totalOrders: orders,
        pendingOrders,
        inProgressOrders,
        completedOrders,
        cancelledOrders,
      },
      financial: {
        totalClientPayments,
        totalCenterRevenue: totalCenterRevenue[0]?.total || 0,
        totalDelegateEarnings: totalDelegateEarnings[0]?.total || 0,
        totalAdminCommission: totalAdminCommission[0]?.total || 0,
        pendingSettlementsAmount: pendingSettlements[0]?.total || 0,
        paidSettlementsAmount: paidSettlements[0]?.total || 0,
      },
      users: {
        totalClients: clients,
        totalDelegates: delegates,
        totalCenters: centers,
      },
      recentActivity: {
        recentOrders,
        recentSettlements: settlements,
      },
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
      recipientType,
      recipient,
      status,
      dateFrom,
      dateTo,
      order,
      sort = "newest",
    } = req.query;
    const pageNum = Math.max(1, parseInt(page) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit) || 10));
    const skip = (pageNum - 1) * limitNum;

    const filter = {};

    if (
      recipientType &&
      ["center", "delegate", "admin"].includes(recipientType)
    ) {
      filter.recipientType = recipientType;
    }

    if (recipient) {
      filter.recipient = recipient;
    }

    if (status && ["pending", "processed", "paid", "failed"].includes(status)) {
      filter.status = status;
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

    if (order) {
      filter.order = order;
    }

    const [total, settlements] = await Promise.all([
      Settlement.countDocuments(filter),
      Settlement.find(filter)
        .populate("order", "orderNumber status")
        .populate("recipient", "name email")
        .sort(sort === "oldest" ? { createdAt: 1 } : { createdAt: -1 })
        .skip(skip)
        .limit(limitNum),
    ]);

    return ApiResponse.success(
      res,
      "قائمة تسويات النظام",
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

exports.paySettlement = async (req, res, next) => {
  try {
    const settlement = await Settlement.findById(req.params.id);
    if (!settlement) {
      const err = new Error("التسوية غير موجودة");
      err.statusCode = 404;
      return next(err);
    }

    if (settlement.paymentStatus === "paid" || settlement.status === "paid") {
      const err = new Error("هذه التسوية تم دفعها مسبقاً");
      err.statusCode = 400;
      return next(err);
    }

    settlement.paymentStatus = "paid";
    settlement.status = "paid";
    settlement.paidAt = new Date();
    settlement.paidBy = req.user.id;
    settlement.notes = settlement.notes || "";
    await settlement.save();

    return ApiResponse.success(res, "تم دفع التسوية بنجاح", { settlement });
  } catch (error) {
    next(error);
  }
};

// GET /users - List all users with pagination
exports.getUsers = async (req, res, next) => {
  try {
    const { role, page = 1, limit = 10 } = req.query;
    const pageNum = Math.max(1, parseInt(page) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit) || 10));
    const skip = (pageNum - 1) * limitNum;

    const filter = { isDeleted: { $ne: true } }; // FIX: SOFT DELETE - Exclude deleted users
    if (role) filter.role = role;

    const total = await User.countDocuments(filter);
    const users = await User.find(filter)
      .select("-password")
      .skip(skip)
      .limit(limitNum)
      .sort({ createdAt: -1 });

    return ApiResponse.success(res, "قائمة المستخدمين", { users }, 200, {
      total,
      page: pageNum,
      limit: limitNum,
      pages: Math.ceil(total / limitNum),
    });
  } catch (error) {
    next(error);
  }
};

// GET /users/:id - Specific user details
exports.getUserById = async (req, res, next) => {
  try {
    // FIX: Soft delete filter - exclude deleted users
    const user = await User.findOne({
      _id: req.params.id,
      isDeleted: { $ne: true },
    }).select("-password");
    if (!user) {
      const err = new Error("المستخدم غير موجود");
      err.statusCode = 404;
      return next(err);
    }
    return ApiResponse.success(res, "تفاصيل المستخدم", { user });
  } catch (error) {
    next(error);
  }
};

// PUT /users/:id/status - Suspend/activate account
exports.updateUserStatus = async (req, res, next) => {
  try {
    const schema = Joi.object({
      isActive: Joi.boolean().required(),
    });

    const { isActive } = validate(schema, req.body);

    // FIX: Soft delete filter - cannot update deleted users
    const user = await User.findOne({
      _id: req.params.id,
      isDeleted: { $ne: true },
    });
    if (!user) {
      const err = new Error("المستخدم غير موجود");
      err.statusCode = 404;
      return next(err);
    }

    user.isActive = isActive;
    await user.save();

    return ApiResponse.success(
      res,
      `تم ${isActive ? "تنشيط" : "تعطيل"} حساب المستخدم بنجاح`,
      {
        user: { id: user._id, name: user.name, isActive: user.isActive },
      },
    );
  } catch (error) {
    next(error);
  }
};

// POST /centers - Create repair center with owner (unified flow)
exports.createCenter = async (req, res, next) => {
  try {
    // Parse FormData JSON fields
    const parsedBody = { ...req.body };

    if (parsedBody.coordinates && typeof parsedBody.coordinates === "string") {
      parsedBody.coordinates = JSON.parse(parsedBody.coordinates);
    }

    if (
      parsedBody.supportedBrands &&
      typeof parsedBody.supportedBrands === "string"
    ) {
      parsedBody.supportedBrands = JSON.parse(parsedBody.supportedBrands);
    }

    if (
      parsedBody.supportedDeviceTypes &&
      typeof parsedBody.supportedDeviceTypes === "string"
    ) {
      parsedBody.supportedDeviceTypes = JSON.parse(
        parsedBody.supportedDeviceTypes,
      );
    }

    const schema = Joi.object({
      ownerName: Joi.string().min(2).required(),
      phone: Joi.string().required(),
      email: Joi.string().email().required(),
      password: Joi.string().min(6).required(),

      name: Joi.string().required(),
      address: Joi.string().required(),
      city: Joi.string().optional(),

      coordinates: Joi.object({
        lat: Joi.number().required(),
        lng: Joi.number().required(),
      }).optional(),

      supportedBrands: Joi.array().items(Joi.string()).default([]),

      supportedDeviceTypes: Joi.array().items(Joi.string()).default([]),

      inspectionFee: Joi.number().min(0).default(0),
    });

    const body = validate(schema, parsedBody);

    // Check duplicate phone
    const existingPhone = await User.findOne({
      phone: body.phone,
      isDeleted: { $ne: true },
    });

    if (existingPhone) {
      const err = new Error("رقم الهاتف مسجل بالفعل");
      err.statusCode = 400;
      return next(err);
    }

    // Check duplicate email
    const existingEmail = await User.findOne({
      email: body.email,
      isDeleted: { $ne: true },
    });

    if (existingEmail) {
      const err = new Error("البريد الإلكتروني مسجل بالفعل");
      err.statusCode = 400;
      return next(err);
    }

    // Create owner account
    const owner = new User({
      name: body.ownerName,
      phone: body.phone,
      email: body.email,
      password: body.password,
      role: "center",
      isVerified: true,
      isActive: true,
    });

    await owner.save();

    try {
      // Create repair center
      const center = new RepairCenter({
        name: body.name,
        owner: owner._id,
        phone: body.phone,
        email: body.email,

        logo: req.file ? req.file.path || req.file.filename : null,

        address: body.address,
        city: body.city,
        coordinates: body.coordinates,

        supportedBrands: body.supportedBrands,
        supportedDeviceTypes: body.supportedDeviceTypes,

        inspectionFee: body.inspectionFee,

        status: "active",
      });

      await center.save();

      return ApiResponse.success(
        res,
        "تم إنشاء مركز الصيانة ومالك المركز بنجاح",
        {
          user: {
            id: owner._id,
            name: owner.name,
            email: owner.email,
          },
          center,
        },
        201,
      );
    } catch (centerError) {
      // Rollback if center creation fails
      await User.deleteOne({ _id: owner._id });
      throw centerError;
    }
  } catch (error) {
    next(error);
  }
};
// PUT /centers/:id/status - Approve/suspend center
exports.updateCenterStatus = async (req, res, next) => {
  try {
    const schema = Joi.object({
      status: Joi.string().valid("pending", "active", "suspended").required(),
    });

    const { status } = validate(schema, req.body);

    // FIX: Soft delete filter - cannot update deleted centers
    const center = await RepairCenter.findOne({
      _id: req.params.id,
      isDeleted: { $ne: true },
    });
    if (!center) {
      const err = new Error("مركز الصيانة غير موجود");
      err.statusCode = 404;
      return next(err);
    }

    center.status = status;
    await center.save();

    return ApiResponse.success(res, "تم تحديث حالة مركز الصيانة بنجاح", {
      center,
    });
  } catch (error) {
    next(error);
  }
};

// GET /centers - List all repair centers with pagination
exports.getCenters = async (req, res, next) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const pageNum = Math.max(1, parseInt(page) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit) || 10));
    const skip = (pageNum - 1) * limitNum;

    // FIX #5: SOFT DELETE - Exclude deleted centers
    const total = await RepairCenter.countDocuments({
      isDeleted: { $ne: true },
    });
    const centers = await RepairCenter.find({ isDeleted: { $ne: true } })
      .populate("owner", "name phone email")
      .skip(skip)
      .limit(limitNum)
      .sort({ createdAt: -1 });

    return ApiResponse.success(res, "قائمة مراكز الصيانة", { centers }, 200, {
      total,
      page: pageNum,
      limit: limitNum,
      pages: Math.ceil(total / limitNum),
    });
  } catch (error) {
    next(error);
  }
};
// GET /centers/:id - Get repair center details
exports.getCenterById = async (req, res, next) => {
  try {
    const center = await RepairCenter.findOne({
      _id: req.params.id,
      isDeleted: { $ne: true },
    }).populate("owner", "-password");

    if (!center) {
      const err = new Error("مركز الصيانة غير موجود");
      err.statusCode = 404;
      return next(err);
    }

    const services = await CenterService.find({
      center: center._id,
      isDeleted: { $ne: true },
    }).sort({ createdAt: -1 });

    const ordersCount = await Order.countDocuments({
      repairCenter: center._id,
    });

    const completedOrders = await Order.countDocuments({
      repairCenter: center._id,
      status: "delivered",
    });

    const activeOrders = await Order.countDocuments({
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

    return ApiResponse.success(res, "تفاصيل مركز الصيانة", {
      center,
      services,
      statistics: {
        ordersCount,
        activeOrders,
        completedOrders,
      },
    });
  } catch (error) {
    next(error);
  }
};
// GET /payment-settings - Get admin payment settings
exports.getPaymentSettings = async (req, res, next) => {
  try {
    let settings = await SystemSetting.findOne({ key: "default" });

    if (!settings) {
      settings = await SystemSetting.create({
        key: "default",
        currency: "IQD",
        isActive: true,
      });
    }

    return ApiResponse.success(res, "إعدادات الدفع", {
      walletOwnerName: settings.walletOwnerName,
      walletNumbers: settings.walletNumbers
        ? Object.fromEntries(settings.walletNumbers)
        : {},
      activePaymentMethods: settings.activePaymentMethods,
      paymentInstructions: settings.paymentInstructions,
    });
  } catch (error) {
    next(error);
  }
};

// PUT /payment-settings - Update admin payment settings
exports.updatePaymentSettings = async (req, res, next) => {
  try {
    const schema = Joi.object({
      walletOwnerName: Joi.string().trim().required(),
      walletNumbers: Joi.object()
        .pattern(
          Joi.string().valid(
            "zain_cash",
            "western_union",
            "visa",
            "cash",
            "asia_pay",
            "mastercard",
          ),
          Joi.string().trim(),
        )
        .optional(),
      activePaymentMethods: Joi.array()
        .items(
          Joi.string().valid(
            "zain_cash",
            "western_union",
            "visa",
            "cash",
            "asia_pay",
            "mastercard",
          ),
        )
        .min(1)
        .required(),
      paymentInstructions: Joi.string().trim().required(),
    });

    const body = validate(schema, req.body);

    let settings = await SystemSetting.findOne({ key: "default" });

    if (!settings) {
      settings = new SystemSetting({ key: "default" });
    }

    settings.walletOwnerName = body.walletOwnerName;
    settings.walletNumbers = body.walletNumbers || settings.walletNumbers || {};
    settings.activePaymentMethods = body.activePaymentMethods;
    settings.paymentInstructions = body.paymentInstructions;
    settings.updatedBy = req.user?._id || null;
    settings.updatedAt = new Date();

    await settings.save();

    return ApiResponse.success(res, "تم تحديث إعدادات الدفع بنجاح", {
      walletOwnerName: settings.walletOwnerName,
      walletNumbers: settings.walletNumbers
        ? Object.fromEntries(settings.walletNumbers)
        : {},
      activePaymentMethods: settings.activePaymentMethods,
      paymentInstructions: settings.paymentInstructions,
    });
  } catch (error) {
    next(error);
  }
};

// GET /financial-settings - Get admin financial settings
exports.getFinancialSettings = async (req, res, next) => {
  try {
    let settings = await SystemSetting.findOne({ key: "default" });

    if (!settings) {
      settings = await SystemSetting.create({
        key: "default",
        currency: "IQD",
        isActive: true,
      });
    }

    return ApiResponse.success(res, "الإعدادات المالية", { settings });
  } catch (error) {
    next(error);
  }
};

// PUT /financial-settings - Update admin financial settings
exports.updateFinancialSettings = async (req, res, next) => {
  try {
    const schema = Joi.object({
      walletOwnerName: Joi.string().allow("").optional(),
      walletNumber: Joi.string().allow("").optional(),
      paymentInstructions: Joi.string().allow("").optional(),
      commissionType: Joi.string().valid("percentage", "fixed").optional(),
      commissionValue: Joi.number().min(0).optional(),
      delegateFeeType: Joi.string().valid("percentage", "fixed").optional(),
      delegateFeeValue: Joi.number().min(0).optional(),
      currency: Joi.string().allow("").optional(),
      isActive: Joi.boolean().optional(),
    });

    const body = validate(schema, req.body);

    let settings = await SystemSetting.findOne({ key: "default" });

    if (!settings) {
      settings = new SystemSetting({ key: "default" });
    }

    Object.assign(settings, body);
    settings.updatedBy = req.user?._id || null;
    settings.updatedAt = new Date();

    await settings.save();

    return ApiResponse.success(res, "تم تحديث الإعدادات المالية بنجاح", {
      settings,
    });
  } catch (error) {
    next(error);
  }
};
//
exports.getPayments = async (req, res, next) => {
  try {
    const { status, page = 1, limit = 10 } = req.query;
    const pageNum = Math.max(1, parseInt(page) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit) || 10));
    const skip = (pageNum - 1) * limitNum;

    const filter = {};
    if (status) filter.status = status;

    const total = await Payment.countDocuments(filter);
    const payments = await Payment.find(filter)
      .populate("order", "orderNumber status")
      .populate("client", "name phone")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum);

    return ApiResponse.success(res, "المدفوعات", { payments }, 200, {
      total,
      page: pageNum,
      limit: limitNum,
      pages: Math.ceil(total / limitNum),
    });
  } catch (error) {
    next(error);
  }
};

exports.reviewPayment = async (req, res, next) => {
  return require("./priceOffer.controller").reviewPayment(req, res, next);
};
// GET /orders - View all orders with search/filter and pagination
exports.getOrders = async (req, res, next) => {
  try {
    const { status, orderNumber, page = 1, limit = 10 } = req.query;
    const pageNum = Math.max(1, parseInt(page) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit) || 10));
    const skip = (pageNum - 1) * limitNum;

    const filter = {};
    if (status) filter.status = status;
    if (orderNumber) filter.orderNumber = new RegExp(orderNumber, "i");

    const total = await Order.countDocuments(filter);
    const orders = await Order.find(filter)
      .populate("client", "name phone")
      .populate("repairCenter", "name phone")
      .populate("delegate", "name phone")
      .skip(skip)
      .limit(limitNum)
      .sort({ createdAt: -1 });

    return ApiResponse.success(res, "جميع الطلبات في النظام", { orders }, 200, {
      total,
      page: pageNum,
      limit: limitNum,
      pages: Math.ceil(total / limitNum),
    });
  } catch (error) {
    next(error);
  }
};

exports.getDelegates = async (req, res, next) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const pageNum = Math.max(1, parseInt(page) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit) || 10));
    const skip = (pageNum - 1) * limitNum;

    // FIX #5: SOFT DELETE - Exclude deleted delegates
    const total = await User.countDocuments({
      role: "delegate",
      isDeleted: { $ne: true },
    });
    const delegates = await User.find({
      role: "delegate",
      isDeleted: { $ne: true },
    })
      .select("-password")
      .skip(skip)
      .limit(limitNum)
      .sort({ createdAt: -1 });

    return ApiResponse.success(res, "قائمة المندوبين", { delegates }, 200, {
      total,
      page: pageNum,
      limit: limitNum,
      pages: Math.ceil(total / limitNum),
    });
  } catch (error) {
    next(error);
  }
};
/**
 * @desc    Get Delegate Applications
 * @route   GET /api/admin/delegate-applications
 * @access  Admin
 */
exports.getDelegateApplications = async (req, res, next) => {
  try {
    const { status, page = 1, limit = 10 } = req.query;

    const pageNum = Math.max(1, parseInt(page) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit) || 10));
    const skip = (pageNum - 1) * limitNum;

    const filter = {};

    if (status) {
      filter.status = status;
    }

    const total = await DelegateApplication.countDocuments(filter);

    const applications = await DelegateApplication.find(filter)
      .select("-password")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum);

    return ApiResponse.success(
      res,
      "طلبات تسجيل المندوبين",
      { applications },
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
/**
 * @desc    Get Delegate Application Details
 * @route   GET /api/admin/delegate-applications/:id
 * @access  Admin
 */
exports.getDelegateApplicationById = async (req, res, next) => {
  try {
    const application = await DelegateApplication.findById(req.params.id)
      .select("-password")
      .populate("reviewedBy", "name email");

    if (!application) {
      const err = new Error("طلب الانضمام غير موجود");
      err.statusCode = 404;
      return next(err);
    }

    return ApiResponse.success(res, "تفاصيل طلب الانضمام", { application });
  } catch (error) {
    next(error);
  }
};
/**
 * @desc    Approve Delegate Application
 * @route   PUT /api/admin/delegate-applications/:id/approve
 * @access  Admin
 */

exports.approveDelegateApplication = async (req, res, next) => {
  try {
    const application = await DelegateApplication.findById(req.params.id);

    if (!application) {
      const err = new Error("طلب الانضمام غير موجود");
      err.statusCode = 404;
      return next(err);
    }

    if (application.status !== "pending") {
      const err = new Error("تم مراجعة هذا الطلب بالفعل");
      err.statusCode = 400;
      return next(err);
    }

    // Check phone
    const phoneExists = await User.findOne({
      phone: application.phone,
      isDeleted: { $ne: true },
    });

    if (phoneExists) {
      const err = new Error("رقم الهاتف مستخدم بالفعل");
      err.statusCode = 400;
      return next(err);
    }

    // Check email
    if (application.email) {
      const emailExists = await User.findOne({
        email: application.email,
        isDeleted: { $ne: true },
      });

      if (emailExists) {
        const err = new Error("البريد الإلكتروني مستخدم بالفعل");
        err.statusCode = 400;
        return next(err);
      }
    }

    // Create Delegate User
    // const delegate = new User({
    //   name: application.name,
    //   phone: application.phone,
    //   email: application.email,
    //   password: application.password,

    //   role: "delegate",

    //   isVerified: true,
    //   isActive: true,

    //   nationalIdFront: application.nationalIdFront,
    //   nationalIdBack: application.nationalIdBack,
    //   drivingLicense: application.drivingLicense,
    //   motorcycleLicense: application.motorcycleLicense,
    // });
    const delegate = new User({
      name: application.name,
      phone: application.phone,
      email: application.email,
      password: application.password,

      role: "delegate",

      isVerified: true,
      isActive: true,

      nationalIdFront: application.nationalIdFront,
      nationalIdBack: application.nationalIdBack,
      drivingLicense: application.drivingLicense,
      motorcycleLicense: application.motorcycleLicense,
    });
    delegate.$locals = {
      passwordAlreadyHashed: true,
    };
    await delegate.save();

    // Delete application after approval
    await application.deleteOne();

    return ApiResponse.success(
      res,
      "تم قبول طلب المندوب بنجاح",
      {
        delegate,
      },
      201,
    );
  } catch (error) {
    next(error);
  }
};
/**
 * @desc    Reject Delegate Application
 * @route   PUT /api/admin/delegate-applications/:id/reject
 * @access  Admin
 */
exports.rejectDelegateApplication = async (req, res, next) => {
  try {
    const schema = Joi.object({
      rejectReason: Joi.string().trim().min(5).required(),
    });

    const { rejectReason } = validate(schema, req.body);

    const application = await DelegateApplication.findById(req.params.id);

    if (!application) {
      const err = new Error("طلب الانضمام غير موجود");
      err.statusCode = 404;
      return next(err);
    }

    if (application.status !== "pending") {
      const err = new Error("تم مراجعة هذا الطلب بالفعل");
      err.statusCode = 400;
      return next(err);
    }

    // Delete uploaded documents from Cloudinary
    const images = [
      application.nationalIdFront,
      application.nationalIdBack,
      application.drivingLicense,
      application.motorcycleLicense,
    ];

    for (const image of images) {
      if (!image?.publicId) continue;

      try {
        await deleteImage(image.publicId);
      } catch (err) {
        console.error("Cloudinary delete error:", err.message);
      }
    }

    // Remove image references
    application.nationalIdFront = null;
    application.nationalIdBack = null;
    application.drivingLicense = null;
    application.motorcycleLicense = null;

    application.status = "rejected";
    application.rejectReason = rejectReason;
    application.reviewedBy = req.user.id;
    application.reviewedAt = new Date();
    application.rejectedAt = new Date();

    await application.save();

    return ApiResponse.success(
      res,
      "تم رفض طلب المندوب بنجاح",
      {
        application,
      },
      200,
    );
  } catch (error) {
    next(error);
  }
};
// POST /delegates - Create a delegate
exports.createDelegate = async (req, res, next) => {
  try {
    // const schema = Joi.object({
    //   name: Joi.string().required(),
    //   phone: Joi.string().required(),
    //   email: Joi.string().email().optional(),
    //   password: Joi.string().min(6).required(),
    // });
    const schema = Joi.object({
      name: Joi.string().required(),
      phone: Joi.string().required(),
      email: Joi.string().email().optional(),
      password: Joi.string().min(6).required(),

      addresses: Joi.array()
        .items(
          Joi.object({
            label: Joi.string().required(),
            address: Joi.string().required(),
            city: Joi.string().required(),
          }),
        )
        .default([]),
    });
    const body = validate(schema, req.body);

    // FIX: Soft delete filter - allow reusing deleted user's phone number
    const existingUser = await User.findOne({
      phone: body.phone,
      isDeleted: { $ne: true },
    });
    if (existingUser) {
      const err = new Error("رقم الهاتف مسجل بالفعل");
      err.statusCode = 400;
      return next(err);
    }

    if (body.email) {
      // FIX: Soft delete filter - allow reusing deleted user's email
      const existingEmail = await User.findOne({
        email: body.email,
        isDeleted: { $ne: true },
      });
      if (existingEmail) {
        const err = new Error("البريد الإلكتروني مسجل بالفعل");
        err.statusCode = 400;
        return next(err);
      }
    }
    const delegate = new User({
      name: body.name,
      phone: body.phone,
      email: body.email,
      password: body.password,
      role: "delegate",
      isVerified: true,
      isActive: true,
      addresses: body.addresses,
    });

    // const delegate = new User({
    //   name: body.name,
    //   phone: body.phone,
    //   email: body.email,
    //   password: body.password,
    //   role: "delegate",
    //   isVerified: true,
    //   isActive: true,
    // });
    await delegate.save();

    return ApiResponse.success(res, "تم إنشاء مندوب بنجاح", { delegate }, 201);
  } catch (error) {
    next(error);
  }
};

// PUT /delegates/:id/status - Activate/suspend delegate account
exports.updateDelegateStatus = async (req, res, next) => {
  try {
    const schema = Joi.object({
      isActive: Joi.boolean().required(),
    });

    const { isActive } = validate(schema, req.body);

    // FIX: Soft delete filter - cannot update deleted delegates
    const delegate = await User.findOne({
      _id: req.params.id,
      role: "delegate",
      isDeleted: { $ne: true },
    });
    if (!delegate) {
      const err = new Error("المندوب غير موجود");
      err.statusCode = 404;
      return next(err);
    }

    delegate.isActive = isActive;
    await delegate.save();

    return ApiResponse.success(
      res,
      `تم ${isActive ? "تنشيط" : "تعطيل"} المندوب بنجاح`,
      { delegate },
    );
  } catch (error) {
    next(error);
  }
};

// GET /orders/:id - Get order details
exports.getOrderById = async (req, res, next) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate("client", "name phone email")
      .populate("repairCenter", "name address phone")
      .populate("delegate", "name phone");

    if (!order) {
      const err = new Error("الطلب غير موجود");
      err.statusCode = 404;
      return next(err);
    }

    const settings = await SystemSetting.findOne({ key: "default" });
    const settlements = await Settlement.find({ order: order._id }).sort({
      createdAt: -1,
    });
    const financialView = await buildFinancialViewForRole({
      role: "admin",
      order,
      settings,
      settlements,
    });

    return ApiResponse.success(res, "تفاصيل الطلب", { order, financialView });
  } catch (error) {
    next(error);
  }
};

// GET /stats/overview
exports.getStatsOverview = async (req, res, next) => {
  try {
    // FIX: Soft delete filter - exclude deleted users and centers from stats
    const usersCount = await User.countDocuments({
      role: "client",
      isDeleted: { $ne: true },
    });
    const delegatesCount = await User.countDocuments({
      role: "delegate",
      isDeleted: { $ne: true },
    });
    const centersCount = await RepairCenter.countDocuments({
      isDeleted: { $ne: true },
    });
    const ordersCount = await Order.countDocuments();
    const revenue = await Order.aggregate([
      { $match: { paymentStatus: "confirmed" } },
      { $group: { _id: null, total: { $sum: "$fees.total" } } },
    ]);

    return ApiResponse.success(res, "نظرة عامة على الإحصائيات", {
      usersCount,
      delegatesCount,
      centersCount,
      ordersCount,
      revenue: revenue.length ? revenue[0].total : 0,
    });
  } catch (error) {
    next(error);
  }
};

// GET /stats/revenue
exports.getStatsRevenue = async (req, res, next) => {
  try {
    const revenueData = await Order.aggregate([
      { $match: { paymentStatus: "confirmed" } },
      {
        $group: {
          _id: "$status",
          total: { $sum: "$fees.total" },
          count: { $sum: 1 },
        },
      },
    ]);

    return ApiResponse.success(res, "تقرير الإيرادات حسب الحالة", {
      revenueData,
    });
  } catch (error) {
    next(error);
  }
};

// GET /stats/centers
exports.getStatsCenters = async (req, res, next) => {
  try {
    const stats = await RepairCenter.aggregate([
      // FIX: Soft delete filter - exclude deleted centers from stats
      {
        $match: {
          isDeleted: { $ne: true },
        },
      },
      {
        $lookup: {
          from: "orders",
          localField: "_id",
          foreignField: "repairCenter",
          as: "orders",
        },
      },
      {
        $project: {
          name: 1,
          status: 1,
          ordersCount: { $size: "$orders" },
          revenue: { $sum: "$orders.fees.total" },
        },
      },
    ]);

    return ApiResponse.success(res, "إحصائيات أداء المراكز", { stats });
  } catch (error) {
    next(error);
  }
};

// GET /stats/delegates
exports.getStatsDelegates = async (req, res, next) => {
  try {
    const stats = await User.aggregate([
      // FIX: Soft delete filter - exclude deleted delegates from stats
      {
        $match: {
          role: "delegate",
          isDeleted: { $ne: true },
        },
      },
      {
        $lookup: {
          from: "orders",
          localField: "_id",
          foreignField: "delegate",
          as: "orders",
        },
      },
      {
        $project: {
          name: 1,
          phone: 1,
          ordersCount: { $size: "$orders" },
          deliveredCount: {
            $size: {
              $filter: {
                input: "$orders",
                as: "order",
                cond: { $eq: ["$$order.status", "delivered"] },
              },
            },
          },
        },
      },
    ]);

    return ApiResponse.success(res, "إحصائيات أداء المندوبين", { stats });
  } catch (error) {
    next(error);
  }
};

// DELETE /users/:id - Delete user
exports.deleteUser = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      const err = new Error("المستخدم غير موجود");
      err.statusCode = 404;
      return next(err);
    }
    // FIX #5: SOFT DELETE - Mark as deleted instead of removing
    user.isDeleted = true;
    user.deletedAt = new Date();
    await user.save(); // ✅ Soft delete instead of hard delete
    return ApiResponse.success(res, "تم حذف المستخدم بنجاح", { user });
  } catch (error) {
    next(error);
  }
};

// DELETE /delegates/:id - Delete delegate
exports.deleteDelegate = async (req, res, next) => {
  try {
    const delegate = await User.findById(req.params.id);
    if (!delegate) {
      const err = new Error("المندوب غير موجود");
      err.statusCode = 404;
      return next(err);
    }
    // FIX #5: SOFT DELETE - Mark as deleted instead of removing
    delegate.isDeleted = true;
    delegate.deletedAt = new Date();
    await delegate.save(); // ✅ Soft delete instead of hard delete
    return ApiResponse.success(res, "تم حذف المندوب بنجاح", { delegate });
  } catch (error) {
    next(error);
  }
};

// DELETE /centers/:id - Delete repair center
exports.deleteCenter = async (req, res, next) => {
  try {
    const center = await RepairCenter.findById(req.params.id);
    if (!center) {
      const err = new Error("مركز الصيانة غير موجود");
      err.statusCode = 404;
      return next(err);
    }
    // FIX #5: SOFT DELETE - Mark as deleted instead of removing
    center.isDeleted = true;
    center.deletedAt = new Date();
    await center.save(); // ✅ Soft delete instead of hard delete
    return ApiResponse.success(res, "تم حذف مركز الصيانة بنجاح", { center });
  } catch (error) {
    next(error);
  }
};
