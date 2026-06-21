const Joi = require("joi");
const Inspection = require("../models/Inspection");
const Order = require("../models/Order");
const RepairCenter = require("../models/RepairCenter");
const validate = require("../utils/validator");
const ApiResponse = require("../utils/apiResponse");
const upload = require("../middleware/upload.middleware");

// POST /api/centers/dashboard/orders/:orderId/inspection
exports.createInspection = async (req, res, next) => {
  try {
    console.log("=== CREATE INSPECTION ===");
    console.log(req.body);
    // FIX: Convert findings from string (FormData) to JSON if needed
    // When sending multipart/form-data, findings comes as JSON string, so parse it
    if (req.body.findings && typeof req.body.findings === "string") {
      try {
        req.body.findings = JSON.parse(req.body.findings);
      } catch (err) {
        const error = new Error(
          "صيغة findings غير صحيحة - يجب أن تكون JSON صالح",
        );
        error.statusCode = 400;
        return next(error);
      }
    }

    const schema = Joi.object({
      technician: Joi.string().optional(),
      findings: Joi.array()
        .items(
          Joi.object({
            issue: Joi.string().required(),
            severity: Joi.string()
              .valid("minor", "major", "critical")
              .required(),
          }),
        )
        .optional(),
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

    const images = req.files ? req.files.map((f) => f.path || f.filename) : [];

    const inspection = new Inspection({
      order: order._id,
      repairCenter: center._id,
      technician: body.technician,
      findings: body.findings || [],
      notes: body.notes,
      images,
    });
    await inspection.save();

    // Update order status to inspecting
    order.status = "inspecting";
    order.statusHistory.push({
      status: "inspecting",
      note: "جاري الفحص من قبل التقني",
      updatedBy: req.user.id,
    });
    await order.save();

    return ApiResponse.success(
      res,
      "تم تسجيل نتيجة الفحص بنجاح",
      { inspection },
      201,
    );
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get inspection report for specific order
 * @route   GET /api/inspection/:orderId
 * @access  Private (client, center, admin)
 */
exports.getInspectionByOrder = async (req, res, next) => {
  try {
    // FIX: Populate required fields before authorization checks
    // CRITICAL: Must populate client, delegate, and repairCenter.owner before checking access
    const order = await Order.findById(req.params.orderId)
      .populate("client", "_id")
      .populate("delegate", "_id")
      .populate("repairCenter", "owner");
    if (!order) {
      const err = new Error("الطلب غير موجود");
      err.statusCode = 404;
      return next(err);
    }

    // FIX #2: SECURITY - Add access control to inspection data
    // Only authorized users can view inspection reports:
    // - Admin (system administrator)
    // - Client (order owner)
    // - Delegate (assigned to this order)
    // - Center owner (assigned to repair this order)
    const isAdmin = req.user.role === "admin";
    const isClient = req.user.id === order.client._id.toString();
    const isDelegate =
      order.delegate && req.user.id === order.delegate._id.toString();
    const isCenterOwner =
      order.repairCenter &&
      order.repairCenter.owner &&
      req.user.id === order.repairCenter.owner.toString();

    if (!isAdmin && !isClient && !isDelegate && !isCenterOwner) {
      const err = new Error("غير مصرح لك بالوصول إلى هذا التقرير");
      err.statusCode = 403;
      return next(err);
    }

    const inspection = await Inspection.findOne({ order: req.params.orderId })
      .populate("order", "orderNumber status")
      .populate("repairCenter", "name address");

    if (!inspection) {
      const err = new Error("تقرير الفحص غير موجود");
      err.statusCode = 404;
      return next(err);
    }

    return ApiResponse.success(res, "تقرير الفحص", { inspection });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update inspection report
 * @route   PUT /api/inspection/:id
 * @access  Private (repair center, admin)
 */
exports.updateInspection = async (req, res, next) => {
  try {
    // FIX: Convert findings from string (FormData) to JSON if needed
    if (req.body.findings && typeof req.body.findings === "string") {
      try {
        req.body.findings = JSON.parse(req.body.findings);
      } catch (err) {
        const error = new Error(
          "صيغة findings غير صحيحة - يجب أن تكون JSON صالح",
        );
        error.statusCode = 400;
        return next(error);
      }
    }

    const schema = Joi.object({
      technician: Joi.string().optional(),
      findings: Joi.array()
        .items(
          Joi.object({
            issue: Joi.string().required(),
            severity: Joi.string()
              .valid("minor", "major", "critical")
              .required(),
          }),
        )
        .optional(),
      notes: Joi.string().allow("").optional(),
    });

    const body = validate(schema, req.body);

    const inspection = await Inspection.findById(req.params.id);
    if (!inspection) {
      const err = new Error("تقرير الفحص غير موجود");
      err.statusCode = 404;
      return next(err);
    }

    // Verify ownership (center or admin)
    if (req.user.role === "center") {
      const center = await RepairCenter.findOne({
        owner: req.user.id,
        _id: inspection.repairCenter,
      });
      if (!center) {
        const err = new Error("غير مصرح لتحديث هذا التقرير");
        err.statusCode = 403;
        return next(err);
      }
    }

    if (body.technician) inspection.technician = body.technician;
    if (body.findings) inspection.findings = body.findings;
    if (body.notes !== undefined) inspection.notes = body.notes;

    if (req.files && req.files.length > 0) {
      inspection.images = req.files.map((f) => f.path || f.filename);
    }

    await inspection.save();

    return ApiResponse.success(res, "تم تحديث تقرير الفحص بنجاح", {
      inspection,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Delete inspection report
 * @route   DELETE /api/inspection/:id
 * @access  Private (admin only)
 */
exports.deleteInspection = async (req, res, next) => {
  try {
    const inspection = await Inspection.findById(req.params.id);
    if (!inspection) {
      const err = new Error("تقرير الفحص غير موجود");
      err.statusCode = 404;
      return next(err);
    }

    // FIX #5: SOFT DELETE - Mark as deleted instead of removing
    inspection.isDeleted = true;
    inspection.deletedAt = new Date();
    await inspection.save(); // ✅ Soft delete instead of hard delete

    return ApiResponse.success(res, "تم حذف تقرير الفحص بنجاح", { inspection });
  } catch (error) {
    next(error);
  }
};
