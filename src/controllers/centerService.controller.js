const Joi = require("joi");
const CenterService = require("../models/CenterService");
const RepairCenter = require("../models/RepairCenter");
const validate = require("../utils/validator");
const ApiResponse = require("../utils/apiResponse");

/**
 * @desc    Create new center service
 * @route   POST /api/center/services
 * @access  Private (Center)
 */
exports.createService = async (req, res, next) => {
  try {
    const schema = Joi.object({
      serviceName: Joi.string().min(2).max(100).required(),
      description: Joi.string().allow("").optional(),
      price: Joi.number().min(0).required(),
      estimatedTime: Joi.string().allow("").optional(),
      warranty: Joi.string().allow("").optional(),
      isAvailable: Joi.boolean().default(true),
    });

    const body = validate(schema, req.body);

    // Get center from logged-in user
    const center = await RepairCenter.findOne({
      owner: req.user.id,
      isDeleted: { $ne: true },
    });

    if (!center) {
      const err = new Error("لم يتم العثور على مركز الصيانة");
      err.statusCode = 404;
      return next(err);
    }

    // Prevent duplicate service names inside same center
    const existingService = await CenterService.findOne({
      center: center._id,
      serviceName: body.serviceName,
      isDeleted: { $ne: true },
    });

    if (existingService) {
      const err = new Error("هذه الخدمة موجودة بالفعل");
      err.statusCode = 400;
      return next(err);
    }

    const service = new CenterService({
      center: center._id,
      serviceName: body.serviceName,
      description: body.description,
      price: body.price,
      estimatedTime: body.estimatedTime,
      warranty: body.warranty,
      isAvailable: body.isAvailable,
    });

    await service.save();

    return ApiResponse.success(
      res,
      "تم إضافة الخدمة بنجاح",
      {
        service,
      },
      201,
    );
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get all center services
 * @route   GET /api/center/services
 * @access  Private (Center)
 */
exports.getCenterServices = async (req, res, next) => {
  try {
    const center = await RepairCenter.findOne({
      owner: req.user.id,
      isDeleted: { $ne: true },
    });

    if (!center) {
      const err = new Error("لم يتم العثور على مركز الصيانة");
      err.statusCode = 404;
      return next(err);
    }

    const services = await CenterService.find({
      center: center._id,
      isDeleted: { $ne: true },
    }).sort({
      createdAt: -1,
    });

    return ApiResponse.success(res, "خدمات مركز الصيانة", {
      total: services.length,
      services,
    });
  } catch (error) {
    next(error);
  }
};
/**
 * @desc    Get service by id
 * @route   GET /api/center/services/:id
 * @access  Private (Center)
 */
exports.getServiceById = async (req, res, next) => {
  try {
    const center = await RepairCenter.findOne({
      owner: req.user.id,
      isDeleted: { $ne: true },
    });

    if (!center) {
      const err = new Error("لم يتم العثور على مركز الصيانة");
      err.statusCode = 404;
      return next(err);
    }

    const service = await CenterService.findOne({
      _id: req.params.id,
      center: center._id,
      isDeleted: { $ne: true },
    });

    if (!service) {
      const err = new Error("الخدمة غير موجودة");
      err.statusCode = 404;
      return next(err);
    }

    return ApiResponse.success(
      res,
      "بيانات الخدمة",
      {
        service,
      },
    );
  } catch (error) {
    next(error);
  }
};
/**
 * @desc    Update center service
 * @route   PUT /api/center/services/:id
 * @access  Private (Center)
 */
exports.updateService = async (req, res, next) => {
  try {
    const schema = Joi.object({
      serviceName: Joi.string().min(2).max(100).optional(),
      description: Joi.string().allow("").optional(),
      price: Joi.number().min(0).optional(),
      estimatedTime: Joi.string().allow("").optional(),
      warranty: Joi.string().allow("").optional(),
      isAvailable: Joi.boolean().optional(),
    });

    const body = validate(schema, req.body);

    const center = await RepairCenter.findOne({
      owner: req.user.id,
      isDeleted: { $ne: true },
    });

    if (!center) {
      const err = new Error("لم يتم العثور على مركز الصيانة");
      err.statusCode = 404;
      return next(err);
    }

    const service = await CenterService.findOne({
      _id: req.params.id,
      center: center._id,
      isDeleted: { $ne: true },
    });

    if (!service) {
      const err = new Error("الخدمة غير موجودة");
      err.statusCode = 404;
      return next(err);
    }

    // منع تكرار اسم الخدمة
    if (
      body.serviceName &&
      body.serviceName !== service.serviceName
    ) {
      const exists = await CenterService.findOne({
        center: center._id,
        serviceName: body.serviceName,
        isDeleted: { $ne: true },
      });

      if (exists) {
        const err = new Error("هذه الخدمة موجودة بالفعل");
        err.statusCode = 400;
        return next(err);
      }

      service.serviceName = body.serviceName;
    }

    if (body.description !== undefined) {
      service.description = body.description;
    }

    if (body.price !== undefined) {
      service.price = body.price;
    }

    if (body.estimatedTime !== undefined) {
      service.estimatedTime = body.estimatedTime;
    }

    if (body.warranty !== undefined) {
      service.warranty = body.warranty;
    }

    if (body.isAvailable !== undefined) {
      service.isAvailable = body.isAvailable;
    }

    await service.save();

    return ApiResponse.success(
      res,
      "تم تحديث الخدمة بنجاح",
      {
        service,
      },
    );
  } catch (error) {
    next(error);
  }
};
/**
 * @desc    Delete center service (Soft Delete)
 * @route   DELETE /api/center/services/:id
 * @access  Private (Center)
 */
exports.deleteService = async (req, res, next) => {
  try {
    const center = await RepairCenter.findOne({
      owner: req.user.id,
      isDeleted: { $ne: true },
    });

    if (!center) {
      const err = new Error("لم يتم العثور على مركز الصيانة");
      err.statusCode = 404;
      return next(err);
    }

    const service = await CenterService.findOne({
      _id: req.params.id,
      center: center._id,
      isDeleted: { $ne: true },
    });

    if (!service) {
      const err = new Error("الخدمة غير موجودة");
      err.statusCode = 404;
      return next(err);
    }

    service.isDeleted = true;
    service.deletedAt = new Date();

    await service.save();

    return ApiResponse.success(
      res,
      "تم حذف الخدمة بنجاح",
      {
        service,
      },
    );
  } catch (error) {
    next(error);
  }
};
/**
 * @desc    Enable / Disable service
 * @route   PATCH /api/center/services/:id/toggle
 * @access  Private (Center)
 */
exports.toggleAvailability = async (req, res, next) => {
  try {
    const center = await RepairCenter.findOne({
      owner: req.user.id,
      isDeleted: { $ne: true },
    });

    if (!center) {
      const err = new Error("لم يتم العثور على مركز الصيانة");
      err.statusCode = 404;
      return next(err);
    }

    const service = await CenterService.findOne({
      _id: req.params.id,
      center: center._id,
      isDeleted: { $ne: true },
    });

    if (!service) {
      const err = new Error("الخدمة غير موجودة");
      err.statusCode = 404;
      return next(err);
    }

    service.isAvailable = !service.isAvailable;

    await service.save();

    return ApiResponse.success(
      res,
      service.isAvailable
        ? "تم تفعيل الخدمة بنجاح"
        : "تم إيقاف الخدمة بنجاح",
      {
        service,
      },
    );
  } catch (error) {
    next(error);
  }
};