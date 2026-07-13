const Joi = require("joi");
const mongoose = require("mongoose");
const User = require("../models/User");
const RepairCenter = require("../models/RepairCenter");
const Order = require("../models/Order");
const validate = require("../utils/validator");
const ApiResponse = require("../utils/apiResponse");

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

// PUT /orders/:id/assign-delegate - Assign delegate to order
exports.assignDelegate = async (req, res, next) => {
  try {
    const schema = Joi.object({
      delegateId: Joi.string().hex().length(24).required(),
    });

    const { delegateId } = validate(schema, req.body);

    // FIX: Soft delete filter - only find non-deleted delegates
    const delegate = await User.findOne({
      _id: delegateId,
      role: "delegate",
      isDeleted: { $ne: true },
    });
    if (!delegate) {
      const err = new Error("المندوب غير موجود أو ليس لديه رول مندوب");
      err.statusCode = 404;
      return next(err);
    }

    // FIX: Validate delegate is active
    if (!delegate.isActive) {
      const err = new Error("المندوب غير فعال حالياً");
      err.statusCode = 400;
      return next(err);
    }

    const order = await Order.findById(req.params.id);
    if (!order) {
      const err = new Error("الطلب غير موجود");
      err.statusCode = 404;
      return next(err);
    }

    // FIX: Validate order status allows delegate assignment
    const validTransitions = Order.getValidTransitions(order.status);
    if (!validTransitions.includes("delegate_assigned")) {
      const err = new Error(
        `لا يمكن تعيين مندوب للطلب في حالة ${order.status}. الحالة الحالية: ${order.status}`,
      );
      err.statusCode = 400;
      return next(err);
    }

    order.delegate = delegateId;
    order.status = "delegate_assigned";
    order.statusHistory.push({
      status: "delegate_assigned",
      note: `تم تعيين المندوب: ${delegate.name}`,
      updatedBy: req.user.id,
    });

    await order.save();

    return ApiResponse.success(res, "تم تعيين المندوب للطلب بنجاح", { order });
  } catch (error) {
    next(error);
  }
};

// GET /delegates - List all delegates
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

    return ApiResponse.success(res, "تفاصيل الطلب", { order });
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
      { $match: { paymentStatus: "paid" } },
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
      { $match: { paymentStatus: "paid" } },
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
