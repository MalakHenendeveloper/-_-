const Joi = require("joi");
const PriceOffer = require("../models/PriceOffer");
const Order = require("../models/Order");
const RepairCenter = require("../models/RepairCenter");
const validate = require("../utils/validator");
const ApiResponse = require("../utils/apiResponse");

// POST /api/centers/dashboard/orders/:orderId/price-offer  (center)
exports.createPriceOffer = async (req, res, next) => {
  try {
    const schema = Joi.object({
      spareParts: Joi.array()
        .items(
          Joi.object({
            name: Joi.string().required(),
            cost: Joi.number().min(0).required(),
          }),
        )
        .default([]),
      laborCost: Joi.number().min(0).required(),
      inspectionFee: Joi.number().min(0).default(0),
      deliveryFee: Joi.number().min(0).default(0),
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
    // Price offer should only be created when order is in "inspecting" or "at_center" status
    if (!["at_center", "inspecting"].includes(order.status)) {
      const err = new Error(
        `لا يمكن إنشاء عرض سعر للطلب في حالة ${order.status}. يجب أن يكون الطلب في الفحص أو في المركز`,
      );
      err.statusCode = 400;
      return next(err);
    }

    // Calculate total
    const partsCost = body.spareParts.reduce((sum, p) => sum + p.cost, 0);
    const totalCost =
      partsCost + body.laborCost + body.inspectionFee + body.deliveryFee;

    // Delete any previous pending offer for this order
    await PriceOffer.deleteMany({ order: order._id, status: "pending" });

    const offer = new PriceOffer({
      order: order._id,
      repairCenter: center._id,
      spareParts: body.spareParts,
      laborCost: body.laborCost,
      inspectionFee: body.inspectionFee,
      deliveryFee: body.deliveryFee,
      totalCost,
      estimatedDays: body.estimatedDays,
      notes: body.notes,
    });
    await offer.save();

    // Update order fees and status
    order.fees.repair = body.laborCost + partsCost;
    order.fees.inspection = body.inspectionFee;
    order.fees.delivery = body.deliveryFee;
    order.fees.total = totalCost;
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
