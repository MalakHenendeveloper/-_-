const Joi = require("joi");
const User = require("../models/User");
const validate = require("../utils/validator");
const ApiResponse = require("../utils/apiResponse");

// GET /profile
exports.getProfile = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id).select("-password");
    return ApiResponse.success(res, "بيانات الملف الشخصي", { user });
  } catch (error) {
    next(error);
  }
};

// PUT /profile
exports.updateProfile = async (req, res, next) => {
  try {
    const schema = Joi.object({
      name: Joi.string().min(2).max(50).optional(),
      email: Joi.string().email().optional(),
    });

    const body = validate(schema, req.body);

    const user = await User.findById(req.user.id);

    if (body.name) user.name = body.name;
    if (body.email) {
      if (body.email !== user.email) {
        const existingEmail = await User.findOne({ email: body.email });
        if (existingEmail) {
          const err = new Error("البريد الإلكتروني مسجل بالفعل");
          err.statusCode = 400;
          return next(err);
        }
      }
      user.email = body.email;
    }

    await user.save();

    return ApiResponse.success(res, "تم تحديث الملف الشخصي بنجاح", {
      user: {
        id: user._id,
        name: user.name,
        phone: user.phone,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    next(error);
  }
};

// PUT /avatar
exports.updateAvatar = async (req, res, next) => {
  try {
    if (!req.file) {
      const err = new Error("يرجى رفع صورة الملف الشخصي");
      err.statusCode = 400;
      return next(err);
    }

    const avatarPath = req.file.path || req.file.filename;

    const user = await User.findById(req.user.id);
    user.avatar = avatarPath;
    await user.save();

    return ApiResponse.success(res, "تم تحديث الصورة الشخصية بنجاح", {
      avatar: user.avatar,
    });
  } catch (error) {
    next(error);
  }
};

// PUT /change-password
exports.changePassword = async (req, res, next) => {
  try {
    const schema = Joi.object({
      currentPassword: Joi.string().required(),
      newPassword: Joi.string().min(6).required(),
    });

    const { currentPassword, newPassword } = validate(schema, req.body);

    const user = await User.findById(req.user.id).select("+password");
    if (!user) {
      const err = new Error("المستخدم غير موجود");
      err.statusCode = 404;
      return next(err);
    }

    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) {
      const err = new Error("كلمة المرور الحالية غير صحيحة");
      err.statusCode = 400;
      return next(err);
    }

    user.password = newPassword;
    // FIX #4: SECURITY - Clear all refresh tokens on password change
    // Forces logout on all devices when user changes password
    user.refreshTokens = []; // ✅ Force logout everywhere
    await user.save();

    return ApiResponse.success(res, "تم تغيير كلمة المرور بنجاح");
  } catch (error) {
    next(error);
  }
};

// GET /addresses
exports.getAddresses = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id).select("addresses");
    return ApiResponse.success(res, "قائمة العناوين", {
      addresses: user.addresses,
    });
  } catch (error) {
    next(error);
  }
};

// POST /addresses
exports.addAddress = async (req, res, next) => {
  try {
    const schema = Joi.object({
      label: Joi.string().required(),
      address: Joi.string().required(),
      city: Joi.string().required(),
      coordinates: Joi.object({
        lat: Joi.number().required(),
        lng: Joi.number().required(),
      }).optional(),
    });

    const body = validate(schema, req.body);

    const user = await User.findById(req.user.id);
    user.addresses.push(body);
    await user.save();

    return ApiResponse.success(
      res,
      "تم إضافة العنوان بنجاح",
      {
        addresses: user.addresses,
      },
      201,
    );
  } catch (error) {
    next(error);
  }
};

// PUT /addresses/:id
exports.updateAddress = async (req, res, next) => {
  try {
    const schema = Joi.object({
      label: Joi.string().optional(),
      address: Joi.string().optional(),
      city: Joi.string().optional(),
      coordinates: Joi.object({
        lat: Joi.number().required(),
        lng: Joi.number().required(),
      }).optional(),
    });

    const body = validate(schema, req.body);

    const user = await User.findById(req.user.id);
    const address = user.addresses.id(req.params.id);

    if (!address) {
      const err = new Error("العنوان غير موجود");
      err.statusCode = 404;
      return next(err);
    }

    if (body.label) address.label = body.label;
    if (body.address) address.address = body.address;
    if (body.city) address.city = body.city;
    if (body.coordinates) address.coordinates = body.coordinates;

    await user.save();

    return ApiResponse.success(res, "تم تحديث العنوان بنجاح", {
      addresses: user.addresses,
    });
  } catch (error) {
    next(error);
  }
};

// DELETE /addresses/:id
exports.deleteAddress = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);
    const address = user.addresses.id(req.params.id);

    if (!address) {
      const err = new Error("العنوان غير موجود");
      err.statusCode = 404;
      return next(err);
    }

    address.deleteOne();
    await user.save();

    return ApiResponse.success(res, "تم حذف العنوان بنجاح", {
      addresses: user.addresses,
    });
  } catch (error) {
    next(error);
  }
};
