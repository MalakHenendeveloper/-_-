const Joi = require("joi");
const PriceOffer = require("../models/PriceOffer");
const Order = require("../models/Order");
const RepairCenter = require("../models/RepairCenter");
const validate = require("../utils/validator");
const ApiResponse = require("../utils/apiResponse");
const Payment = require("../models/Payment");
const SystemSetting = require("../models/SystemSetting");
const Settlement = require("../models/Settlement");
const User = require("../models/User");
const {
  calculateFinancials,
  buildFinancialViewForRole,
} = require("../utils/financialCalculator");
// POST /api/centers/dashboard/orders/:orderId/price-offer  (center)
exports.createPriceOffer = async (req, res, next) => {
  try {
    const schema = Joi.object({
      totalCost: Joi.number().min(0).required(),
      estimatedDays: Joi.number().min(0).optional(),
      notes: Joi.string().allow("").optional(),
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

    // FIX: Validate order status allows price offer creation
    if (!["at_center", "inspecting"].includes(order.status)) {
      const err = new Error(
        `لا يمكن إنشاء عرض سعر للطلب في حالة ${order.status}. يجب أن يكون الطلب في الفحص أو في المركز`,
      );
      err.statusCode = 400;
      return next(err);
    }

    // Delete any previous pending offer for this order
    await PriceOffer.deleteMany({ order: order._id, status: "pending" });

    const offer = new PriceOffer({
      order: order._id,
      repairCenter: center._id,
      totalCost: body.totalCost,
      estimatedDays: body.estimatedDays,
      notes: body.notes,
    });
    await offer.save();

    // Get system settings for fees
    const settings = await SystemSetting.findOne({ key: "default" });
    const pickupFee = settings?.delegateFeeValue || 0;
    const deliveryFee = settings?.delegateFeeValue || 0;

    // Calculate admin commission based on total repair cost
    let adminCommission = 0;
    if (settings?.commissionType === "percentage") {
      adminCommission = Number(
        ((body.totalCost * settings.commissionValue) / 100).toFixed(2),
      );
    } else {
      adminCommission = Number(settings?.commissionValue || 0);
    }

    // Update order fees and status
    order.fees.totalRepairCost = body.totalCost;
    order.fees.pickupFee = pickupFee;
    order.fees.deliveryFee = deliveryFee;
    order.fees.adminCommission = adminCommission;
    order.fees.total =
      body.totalCost + pickupFee + deliveryFee + adminCommission;
    order.status = "awaiting_approval";
    order.statusHistory.push({
      status: "awaiting_approval",
      note: "تم إرسال عرض السعر، بانتظار موافقة العميل",
      updatedBy: req.user.id,
    });
    await order.save();

    return ApiResponse.success(res, "تم إرسال عرض السعر بنجاح", { offer }, 201);
  } catch (error) {
    next(error);
  }
};

// PUT /api/orders/:id/approve-offer  (client)
exports.approveOffer = async (req, res, next) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) {
      const err = new Error("الطلب غير موجود");
      err.statusCode = 404;
      return next(err);
    }

    if (order.client.toString() !== req.user.id) {
      const err = new Error("غير مصرح لك");
      err.statusCode = 403;
      return next(err);
    }

    if (order.status !== "awaiting_approval") {
      const err = new Error("لا يوجد عرض سعر بانتظار موافقتك");
      err.statusCode = 400;
      return next(err);
    }

    const offer = await PriceOffer.findOne({
      order: order._id,
      status: "pending",
    });
    if (!offer) {
      const err = new Error("عرض السعر غير موجود");
      err.statusCode = 404;
      return next(err);
    }

    offer.status = "approved";
    offer.respondedAt = new Date();
    await offer.save();

    order.status = "approved";
    order.clientApproval = { status: "approved", timestamp: new Date() };
    order.statusHistory.push({
      status: "approved",
      note: "وافق العميل على عرض السعر",
      updatedBy: req.user.id,
    });

    if (!order.financialSnapshot) {
      const settings = await SystemSetting.findOne({ key: "default" });
      const financials = await calculateFinancials({
        repairAmount: order.fees?.repair || 0,
        inspectionFee: order.fees?.inspection || 0,
        deliveryFee: order.fees?.delivery || 0,
        settings,
      });
      order.financialSnapshot = financials;
    }

    await order.save();

    return ApiResponse.success(
      res,
      "تمت الموافقة على عرض السعر، سيبدأ الإصلاح قريباً",
      { order },
    );
  } catch (error) {
    next(error);
  }
};

// PUT /api/orders/:id/reject-offer  (client)
exports.rejectOffer = async (req, res, next) => {
  try {
    const schema = Joi.object({
      note: Joi.string().allow("").optional(),
    });
    const body = validate(schema, req.body);

    const order = await Order.findById(req.params.id);
    if (!order) {
      const err = new Error("الطلب غير موجود");
      err.statusCode = 404;
      return next(err);
    }

    if (order.client.toString() !== req.user.id) {
      const err = new Error("غير مصرح لك");
      err.statusCode = 403;
      return next(err);
    }

    if (order.status !== "awaiting_approval") {
      const err = new Error("لا يوجد عرض سعر بانتظار ردك");
      err.statusCode = 400;
      return next(err);
    }

    const offer = await PriceOffer.findOne({
      order: order._id,
      status: "pending",
    });
    if (offer) {
      offer.status = "rejected";
      offer.respondedAt = new Date();
      await offer.save();
    }

    order.status = "rejected";
    order.clientApproval = {
      status: "rejected",
      timestamp: new Date(),
      note: body.note,
    };
    order.statusHistory.push({
      status: "rejected",
      note: body.note || "رفض العميل عرض السعر",
      updatedBy: req.user.id,
    });
    await order.save();

    return ApiResponse.success(res, "تم رفض عرض السعر", { order });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get price offer for specific order
 * @route   GET /api/price-offer/:orderId
 * @access  Private (client, center, admin)
 */
exports.getPriceOfferByOrder = async (req, res, next) => {
  try {
    // FIX #5: SOFT DELETE - Exclude deleted offers
    const offer = await PriceOffer.findOne({
      order: req.params.orderId,
      isDeleted: { $ne: true },
    })
      .populate("order", "orderNumber status")
      .populate("repairCenter", "name phone address");

    if (!offer) {
      const err = new Error("عرض السعر غير موجود");
      err.statusCode = 404;
      return next(err);
    }

    return ApiResponse.success(res, "عرض السعر", { offer });
  } catch (error) {
    next(error);
  }
};

exports.getPaymentByOrder = async (req, res, next) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) {
      const err = new Error("الطلب غير موجود");
      err.statusCode = 404;
      return next(err);
    }

    const isClient = order.client.toString() === req.user.id;
    const isAdmin = req.user.role === "admin";
    let isCenterOwner = false;

    if (req.user.role === "center") {
      const center = await RepairCenter.findOne({
        owner: req.user.id,
        _id: order.repairCenter,
      });
      isCenterOwner = !!center;
    }

    if (!isClient && !isAdmin && !isCenterOwner) {
      const err = new Error("غير مصرح لك");
      err.statusCode = 403;
      return next(err);
    }

    const payment = await Payment.findOne({ order: order._id })
      .populate("client", "name phone email")
      .populate("reviewedBy", "name phone");
    const settings = await SystemSetting.findOne({ key: "default" });
    const settlements =
      req.user.role === "admin"
        ? await Settlement.find({ order: order._id }).sort({ createdAt: -1 })
        : [];
    const financialView = await buildFinancialViewForRole({
      role: req.user.role,
      order,
      payment,
      settings,
      settlements,
    });

    return ApiResponse.success(res, "تفاصيل الدفع للطلب", {
      order,
      paymentInfo: {
        walletOwnerName: settings?.walletOwnerName || "",
        walletNumber: settings?.walletNumber || "",
        availablePaymentMethods: settings?.activePaymentMethods || [
          "zain_cash",
        ],
        paymentInstructions: settings?.paymentInstructions || "",
      },
      payment,
      financialView,
    });
  } catch (error) {
    next(error);
  }
};
//
exports.submitPayment = async (req, res, next) => {
  try {
    const schema = Joi.object({
      paymentMethod: Joi.string()
        .valid("zain_cash", "western_union", "visa", "cash")
        .required(),
      senderWalletNumber: Joi.string().trim().required(),
      transferReference: Joi.string().trim().required(),
      notes: Joi.string().trim().allow("").optional(),
    });

    const body = validate(schema, req.body);

    const order = await Order.findById(req.params.id);
    if (!order) {
      const err = new Error("الطلب غير موجود");
      err.statusCode = 404;
      return next(err);
    }

    if (order.client.toString() !== req.user.id) {
      const err = new Error("غير مصرح لك");
      err.statusCode = 403;
      return next(err);
    }

    if (order.status !== "approved") {
      const err = new Error(
        "لا يمكن إرسال إثبات الدفع إلا بعد موافقة العميل على العرض",
      );
      err.statusCode = 400;
      return next(err);
    }

    const existingPayment = await Payment.findOne({ order: order._id });
    if (existingPayment) {
      const err = new Error("تم إرسال دفعة مسبقاً لهذا الطلب");
      err.statusCode = 400;
      return next(err);
    }

    const screenshot = req.file ? req.file.path || req.file.filename : null;

    const payment = await Payment.create({
      order: order._id,
      client: req.user.id,
      amount: order.fees?.total || 0,
      paymentMethod: body.paymentMethod,
      senderWalletNumber: body.senderWalletNumber,
      transferReference: body.transferReference,
      screenshot,
      notes: body.notes || null,
      status: "waiting_confirmation",
    });

    order.paymentStatus = "pending";
    order.paymentId = payment._id;
    order.statusHistory.push({
      status: order.status,
      note: "تم إرسال إثبات الدفع للمراجعة",
      updatedBy: req.user.id,
    });

    await order.save();

    return ApiResponse.success(res, "تم استلام إثبات الدفع بنجاح", {
      payment,
      order,
    });
  } catch (error) {
    next(error);
  }
};

exports.addPaymentScreenshot = async (req, res, next) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) {
      const err = new Error("الطلب غير موجود");
      err.statusCode = 404;
      return next(err);
    }

    if (order.client.toString() !== req.user.id) {
      const err = new Error("غير مصرح لك");
      err.statusCode = 403;
      return next(err);
    }

    const payment = await Payment.findOne({ order: order._id });
    if (!payment) {
      const err = new Error("لا توجد دفعة لهذا الطلب");
      err.statusCode = 404;
      return next(err);
    }

    if (!req.file) {
      const err = new Error("يجب إرسال صورة");
      err.statusCode = 400;
      return next(err);
    }

    payment.screenshot = req.file.path || req.file.filename;
    await payment.save();

    return ApiResponse.success(res, "تم إضافة الصورة بنجاح", {
      payment,
    });
  } catch (error) {
    next(error);
  }
};

exports.reviewPayment = async (req, res, next) => {
  try {
    const schema = Joi.object({
      status: Joi.string().valid("confirmed", "rejected").required(),
      rejectionReason: Joi.string().allow("").optional(),
      notes: Joi.string().allow("").optional(),
    });

    const body = validate(schema, req.body);

    const payment = await Payment.findById(req.params.paymentId).populate(
      "order",
    );
    if (!payment) {
      const err = new Error("دفعة غير موجودة");
      err.statusCode = 404;
      return next(err);
    }

    payment.status = body.status;
    payment.reviewedBy = req.user.id;
    payment.reviewedAt = new Date();
    payment.rejectionReason = body.rejectionReason || null;
    payment.notes = body.notes || null;
    await payment.save();

    const order = await Order.findById(payment.order._id);
    if (!order) {
      const err = new Error("الطلب غير موجود");
      err.statusCode = 404;
      return next(err);
    }

    const shouldCreateSettlements = body.status === "confirmed";

    order.paymentStatus = shouldCreateSettlements ? "confirmed" : "rejected";
    order.statusHistory.push({
      status: order.status,
      note: shouldCreateSettlements
        ? "تم تأكيد الدفع من الإدارة"
        : "تم رفض الدفع من الإدارة",
      updatedBy: req.user.id,
    });

    if (shouldCreateSettlements) {
      const settings = await SystemSetting.findOne({ key: "default" });
      if (!order.financialSnapshot) {
        const financials = await calculateFinancials({
          repairAmount: order.fees?.repair || 0,
          inspectionFee: order.fees?.inspection || 0,
          deliveryFee: order.fees?.delivery || 0,
          settings,
        });
        order.financialSnapshot = financials;
      }

      const existingSettlements = await Settlement.find({ order: order._id });
      const existingTypes = new Set(
        existingSettlements.map((item) => item.recipientType),
      );

      if (!existingTypes.has("center") && order.repairCenter) {
        const center = await RepairCenter.findById(order.repairCenter);
        const centerOwner = center?.owner
          ? await User.findById(center.owner)
          : null;
        if (centerOwner) {
          await Settlement.create({
            order: order._id,
            recipient: centerOwner._id,
            recipientName: centerOwner.name,
            recipientType: "center",
            orderNumber: order.orderNumber,
            amount: order.financialSnapshot?.centerAmount || 0,
            status: "pending",
          });
        }
      }

      if (!existingTypes.has("delegate") && order.delegate) {
        const delegateUser = await User.findById(order.delegate);
        if (delegateUser) {
          await Settlement.create({
            order: order._id,
            recipient: delegateUser._id,
            recipientName: delegateUser.name,
            recipientType: "delegate",
            orderNumber: order.orderNumber,
            amount: order.financialSnapshot?.delegateFee || 0,
            status: "pending",
          });
        }
      }

      if (!existingTypes.has("admin")) {
        await Settlement.create({
          order: order._id,
          recipient: req.user.id,
          recipientName: req.user.name || "Admin",
          recipientType: "admin",
          orderNumber: order.orderNumber,
          amount: order.financialSnapshot?.adminCommission || 0,
          status: "pending",
        });
      }
    }

    await order.save();

    return ApiResponse.success(res, "تمت مراجعة الدفع بنجاح", {
      payment,
      order,
    });
  } catch (error) {
    next(error);
  }
};
/**
 * @desc    Delete price offer
 * @route   DELETE /api/price-offer/:id
 * @access  Private (repair center, admin)
 */
exports.deletePriceOffer = async (req, res, next) => {
  try {
    const offer = await PriceOffer.findById(req.params.id);
    if (!offer) {
      const err = new Error("عرض السعر غير موجود");
      err.statusCode = 404;
      return next(err);
    }

    // Verify ownership (center or admin)
    if (req.user.role === "center") {
      const center = await RepairCenter.findOne({
        owner: req.user.id,
        _id: offer.repairCenter,
      });
      if (!center) {
        const err = new Error("غير مصرح لحذف هذا العرض");
        err.statusCode = 403;
        return next(err);
      }
    }

    // FIX #5: SOFT DELETE - Mark as deleted instead of removing
    offer.isDeleted = true;
    offer.deletedAt = new Date();
    await offer.save(); // ✅ Soft delete instead of hard delete

    return ApiResponse.success(res, "تم حذف عرض السعر بنجاح", { offer });
  } catch (error) {
    next(error);
  }
};
