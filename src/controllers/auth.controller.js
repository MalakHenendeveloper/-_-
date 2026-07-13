const Joi = require("joi");
const jwt = require("jsonwebtoken");
const config = require("../config/env");
const User = require("../models/User");
const DelegateApplication = require("../models/DelegateApplication");
const OTP = require("../models/OTP");
const generateOTP = require("../utils/generateOTP");
const sendSMS = require("../utils/sendSMS");
const sendEmail = require("../utils/sendEmail");
const ApiResponse = require("../utils/apiResponse");
const validate = require("../utils/validator");
const {
  generateAccessToken,
  generateRefreshToken,
} = require("../utils/generateToken");

/**
 * @desc    Register a new user (client/delegate/admin)
 * @route   POST /api/auth/register
 * @access  Public
 * @param   {String} name - User full name
 * @param   {String} phone - Unique phone number
 * @param   {String} email - User email (optional)
 * @param   {String} password - Password (min 6 chars)
 * @param   {String} role - User role (client/delegate/admin)
 * @returns {Object} User object and tokens
 */
exports.register = async (req, res, next) => {
  try {
    const schema = Joi.object({
      name: Joi.string().min(2).max(50).required(),
      phone: Joi.string().min(8).max(15).required(),
      email: Joi.string().email().optional(), // ✅ REFACTOR: Email is optional (no OTP required)
      password: Joi.string().min(6).required(),
      // FIX #1: SECURITY - Remove role from public registration
      // Only "client" role is allowed. Delegate and Admin accounts
      // must be created through admin dashboard operations.
    });

    const body = validate(schema, req.body);

    // Check if phone already registered (exclude deleted users)
    // FIX: Soft delete filter - allow reusing deleted user's phone number
    const existingUser = await User.findOne({
      phone: body.phone,
      isDeleted: { $ne: true }, // Only reject if non-deleted user exists
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
        isDeleted: { $ne: true }, // Only reject if non-deleted user exists
      });
      if (existingEmail) {
        const err = new Error("البريد الإلكتروني مسجل بالفعل");
        err.statusCode = 400;
        return next(err);
      }
    }

    // Create user - immediately verified (no OTP required)
    // FIX #1: SECURITY - Always force role to "client" regardless of request
    const user = new User({
      name: body.name,
      phone: body.phone,
      email: body.email,
      password: body.password,
      role: "client", // ✅ Hardcoded - prevents privilege escalation
      isVerified: true, // ✅ REFACTOR: No OTP required - set to true immediately
    });

    await user.save();

    // ✅ REFACTOR: Generate tokens for immediate login (no OTP verification needed)
    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);

    // Save refresh token in DB
    user.refreshTokens.push(refreshToken);
    await user.save();

    return ApiResponse.success(
      res,
      "تم تسجيل الحساب بنجاح",
      {
        user: {
          id: user._id,
          name: user.name,
          phone: user.phone,
          email: user.email,
          role: user.role,
          isVerified: user.isVerified,
          isActive: user.isActive,
        },
        accessToken,
        refreshToken,
      },
      201,
    );
  } catch (error) {
    next(error);
  }
};

// Login user
exports.login = async (req, res, next) => {
  try {
    const schema = Joi.object({
      phone: Joi.string().required(),
      password: Joi.string().required(),
    });

    const body = validate(schema, req.body);

    // FIX: Soft delete filter - prevent deleted users from authenticating
    // Find user (we need to select password because we want to compare)
    const user = await User.findOne({
      phone: body.phone,
      isDeleted: { $ne: true }, // Prevent deleted users from logging in
    });
    if (!user) {
      const err = new Error("بيانات الدخول غير صحيحة");
      err.statusCode = 401;
      return next(err);
    }
    // Delegate must use delegate login endpoint
    if (user.role === "delegate") {
      const err = new Error("يرجى تسجيل الدخول من خلال تطبيق المندوب");
      err.statusCode = 403;
      return next(err);
    }

    // Check if account is suspended
    if (!user.isActive) {
      const err = new Error("هذا الحساب معطل");
      err.statusCode = 401;
      return next(err);
    }

    // Check password
    const isMatch = await user.comparePassword(body.password);
    if (!isMatch) {
      const err = new Error("بيانات الدخول غير صحيحة");
      err.statusCode = 401;
      return next(err);
    }

    // Generate tokens
    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);

    // Save refresh token in DB
    user.refreshTokens.push(refreshToken);
    await user.save();

    return ApiResponse.success(res, "تم تسجيل الدخول بنجاح", {
      user: {
        id: user._id,
        name: user.name,
        phone: user.phone,
        email: user.email,
        role: user.role,
        isVerified: user.isVerified,
        isActive: user.isActive,
      },
      accessToken,
      refreshToken,
    });
  } catch (error) {
    next(error);
  }
};

// Refresh token rotation
exports.refreshToken = async (req, res, next) => {
  try {
    const schema = Joi.object({
      refreshToken: Joi.string().required(),
    });

    const { refreshToken } = validate(schema, req.body);

    // Verify token
    let decoded;
    try {
      decoded = jwt.verify(refreshToken, config.jwt.refreshSecret);
    } catch (err) {
      const error = new Error("Refresh token غير صالح أو منتهي الصلاحية");
      error.statusCode = 401;
      return next(error);
    }

    // Find user by ID
    // FIX: Soft delete filter - prevent deleted users from refreshing tokens
    const user = await User.findOne({
      _id: decoded.id,
      isDeleted: { $ne: true }, // Prevent deleted users from refreshing
    });
    if (!user) {
      const error = new Error("المستخدم غير موجود");
      error.statusCode = 401;
      return next(error);
    }

    // Check if refresh token is registered
    const tokenIndex = user.refreshTokens.indexOf(refreshToken);
    if (tokenIndex === -1) {
      // Token reuse detected -> clear all refresh tokens for security
      user.refreshTokens = [];
      await user.save();
      const error = new Error(
        "تم الكشف عن محاولة إعادة استخدام التوكن. يرجى تسجيل الدخول مجدداً.",
      );
      error.statusCode = 401;
      return next(error);
    }

    // Generate new tokens
    const newAccessToken = generateAccessToken(user);
    const newRefreshToken = generateRefreshToken(user);

    // Replace the old refresh token with the new one
    user.refreshTokens[tokenIndex] = newRefreshToken;
    await user.save();

    return ApiResponse.success(res, "تم تجديد التوكن بنجاح", {
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
    });
  } catch (error) {
    next(error);
  }
};

// Logout
exports.logout = async (req, res, next) => {
  try {
    const schema = Joi.object({
      refreshToken: Joi.string().required(),
    });

    const { refreshToken } = validate(schema, req.body);

    // Verify token or decode it to find user
    let decoded;
    try {
      decoded = jwt.decode(refreshToken);
    } catch (err) {
      const error = new Error("Refresh token غير صالح");
      error.statusCode = 400;
      return next(error);
    }

    if (!decoded || !decoded.id) {
      const error = new Error("Refresh token غير صالح");
      error.statusCode = 400;
      return next(error);
    }

    const user = await User.findById(decoded.id);
    if (user) {
      // Remove refresh token
      user.refreshTokens = user.refreshTokens.filter((t) => t !== refreshToken);
      await user.save();
    }

    return ApiResponse.success(res, "تم تسجيل الخروج بنجاح");
  } catch (error) {
    next(error);
  }
};
/**
 * @desc    Register Delegate Application
 * @route   POST /api/auth/register-delegate
 * @access  Public
 */
// exports.registerDelegate = async (req, res, next) => {
//   try {
//     const schema = Joi.object({
//       name: Joi.string().required(),
//       phone: Joi.string().required(),
//       email: Joi.string().email().optional(),
//       password: Joi.string().min(6).required(),
//     });

//     const body = validate(schema, req.body);

//     // Required Images
//     if (
//       !req.files?.nationalIdFront ||
//       !req.files?.nationalIdBack ||
//       !req.files?.drivingLicense ||
//       !req.files?.motorcycleLicense
//     ) {
//       return ApiResponse.error(
//         res,
//         "يجب رفع البطاقة الأمامية والخلفية ورخصة القيادة ورخصة الموتوسيكل",
//         400,
//       );
//     }

//     // User already exists
//     const existingUser = await User.findOne({
//       $or: [
//         { phone: body.phone },
//         ...(body.email ? [{ email: body.email }] : []),
//       ],
//       isDeleted: { $ne: true },
//     });

//     if (existingUser) {
//       return ApiResponse.error(
//         res,
//         "رقم الهاتف أو البريد الإلكتروني مستخدم بالفعل",
//         400,
//       );
//     }

//     // Previous application
//     let application = await DelegateApplication.findOne({
//       phone: body.phone,
//     });

//     // Pending request
//     if (application && application.status === "pending") {
//       return ApiResponse.error(res, "لديك طلب قيد المراجعة بالفعل", 400);
//     }

//     // Rejected request -> Update existing application
//     if (application && application.status === "rejected") {
//       application.name = body.name;
//       application.email = body.email;
//       application.password = body.password;

//       application.nationalIdFront = {
//         url: req.files.nationalIdFront[0].path,
//         publicId:
//           req.files.nationalIdFront[0].filename ||
//           req.files.nationalIdFront[0].public_id,
//       };

//       application.nationalIdBack = {
//         url: req.files.nationalIdBack[0].path,
//         publicId:
//           req.files.nationalIdBack[0].filename ||
//           req.files.nationalIdBack[0].public_id,
//       };

//       application.drivingLicense = {
//         url: req.files.drivingLicense[0].path,
//         publicId:
//           req.files.drivingLicense[0].filename ||
//           req.files.drivingLicense[0].public_id,
//       };

//       application.motorcycleLicense = {
//         url: req.files.motorcycleLicense[0].path,
//         publicId:
//           req.files.motorcycleLicense[0].filename ||
//           req.files.motorcycleLicense[0].public_id,
//       };

//       application.status = "pending";
//       application.rejectReason = null;
//       application.reviewedAt = null;
//       application.reviewedBy = null;
//       application.rejectedAt = null;

//       await application.save();

//       return ApiResponse.success(res, "تم إعادة إرسال الطلب بنجاح", {}, 200);
//     }

//     application = new DelegateApplication({
//       name: body.name,
//       phone: body.phone,
//       email: body.email,
//       password: body.password,
//       nationalIdFront: {
//         url: req.files.nationalIdFront[0].path,
//         publicId:
//           req.files.nationalIdFront[0].filename ||
//           req.files.nationalIdFront[0].public_id,
//       },

//       nationalIdBack: {
//         url: req.files.nationalIdBack[0].path,
//         publicId:
//           req.files.nationalIdBack[0].filename ||
//           req.files.nationalIdBack[0].public_id,
//       },

//       drivingLicense: {
//         url: req.files.drivingLicense[0].path,
//         publicId:
//           req.files.drivingLicense[0].filename ||
//           req.files.drivingLicense[0].public_id,
//       },

//       motorcycleLicense: {
//         url: req.files.motorcycleLicense[0].path,
//         publicId:
//           req.files.motorcycleLicense[0].filename ||
//           req.files.motorcycleLicense[0].public_id,
//       },
//     });

//     await application.save();

//     return ApiResponse.success(
//       res,
//       "تم إرسال طلب الانضمام بنجاح، وسيتم مراجعته من الإدارة",
//       {},
//       201,
//     );
//   } catch (error) {
//     next(error);
//   }
// };

// Send OTP for password reset only
// ✅ REFACTOR: Registration OTP removed - this is only for reset_password flow

/**
 * @desc    Register Delegate Application
 * @route   POST /api/auth/register-delegate
 * @access  Public
 */
// exports.registerDelegate = async (req, res, next) => {
//   try {
//     const schema = Joi.object({
//       name: Joi.string().required(),
//       phone: Joi.string().required(),
//       email: Joi.string().email().optional().allow(null, ""),
//       password: Joi.string().min(6).required(),
//     });

//     const body = validate(schema, req.body);

//     // 👇 حطهم هنا
//     console.log("========== FILES ==========");
//     console.dir(req.files, { depth: null });
//     console.log("===========================");

//     // Required Images
//     if (
//       !req.files?.nationalIdFront ||
//       !req.files?.nationalIdBack ||
//       !req.files?.drivingLicense ||
//       !req.files?.motorcycleLicense
//     ) {
//       return ApiResponse.error(
//         res,
//         "يجب رفع البطاقة الأمامية والخلفية ورخصة القيادة ورخصة الموتوسيكل",
//         400,
//       );
//     }

//     // Check if there is already an approved user
//     const existingUser = await User.findOne({
//       phone: body.phone,
//       isDeleted: { $ne: true },
//     });

//     if (existingUser) {
//       return ApiResponse.error(res, "رقم الهاتف مستخدم بالفعل", 400);
//     }

//     // Search previous application by phone
//     let application = await DelegateApplication.findOne({
//       phone: body.phone,
//     });

//     // Still pending
//     if (application && application.status === "pending") {
//       return ApiResponse.error(res, "لديك طلب قيد المراجعة بالفعل", 400);
//     }

//     // Rejected -> Update same application
//     if (application && application.status === "rejected") {
//       // Delete old images from Cloudinary
//       const oldImages = [
//         application.nationalIdFront,
//         application.nationalIdBack,
//         application.drivingLicense,
//         application.motorcycleLicense,
//       ];

//       for (const image of oldImages) {
//         if (image?.publicId) {
//           try {
//             await deleteImage(image.publicId);
//           } catch (err) {
//             console.error("Cloudinary delete error:", err.message);
//           }
//         }
//       }

//       application.name = body.name;
//       application.email = body.email;
//       application.password = body.password;

//       application.nationalIdFront = {
//         url: req.files.nationalIdFront[0].path,
//         publicId:
//           req.files.nationalIdFront[0].filename ||
//           req.files.nationalIdFront[0].public_id,
//       };

//       application.nationalIdBack = {
//         url: req.files.nationalIdBack[0].path,
//         publicId:
//           req.files.nationalIdBack[0].filename ||
//           req.files.nationalIdBack[0].public_id,
//       };

//       application.drivingLicense = {
//         url: req.files.drivingLicense[0].path,
//         publicId:
//           req.files.drivingLicense[0].filename ||
//           req.files.drivingLicense[0].public_id,
//       };

//       application.motorcycleLicense = {
//         url: req.files.motorcycleLicense[0].path,
//         publicId:
//           req.files.motorcycleLicense[0].filename ||
//           req.files.motorcycleLicense[0].public_id,
//       };

//       application.status = "pending";
//       application.rejectReason = null;
//       application.reviewedAt = null;
//       application.reviewedBy = null;
//       application.rejectedAt = null;

//       await application.save();

//       return ApiResponse.success(
//         res,
//         "تم إعادة إرسال طلب الانضمام بنجاح",
//         { application },
//         200,
//       );
//     }

//     // Create new application
//     application = new DelegateApplication({
//       name: body.name,
//       phone: body.phone,
//       email: body.email,
//       password: body.password,

//       nationalIdFront: {
//         url: req.files.nationalIdFront[0].path,
//         publicId:
//           req.files.nationalIdFront[0].filename ||
//           req.files.nationalIdFront[0].public_id,
//       },

//       nationalIdBack: {
//         url: req.files.nationalIdBack[0].path,
//         publicId:
//           req.files.nationalIdBack[0].filename ||
//           req.files.nationalIdBack[0].public_id,
//       },

//       drivingLicense: {
//         url: req.files.drivingLicense[0].path,
//         publicId:
//           req.files.drivingLicense[0].filename ||
//           req.files.drivingLicense[0].public_id,
//       },

//       motorcycleLicense: {
//         url: req.files.motorcycleLicense[0].path,
//         publicId:
//           req.files.motorcycleLicense[0].filename ||
//           req.files.motorcycleLicense[0].public_id,
//       },
//     });

//     await application.save();

//     return ApiResponse.success(
//       res,
//       "تم إرسال طلب الانضمام بنجاح، وسيتم مراجعته من الإدارة",
//       { application },
//       201,
//     );
//   } catch (error) {
//     next(error);
//   }
// };
exports.registerDelegate = async (req, res, next) => {
  try {
    const schema = Joi.object({
      name: Joi.string().required(),
      phone: Joi.string().required(),
      email: Joi.string().email().optional().allow(null, ""),
      password: Joi.string().min(6).required(),

      nationalIdFront: Joi.object({
        url: Joi.string().required(),
        publicId: Joi.string().required(),
      }).required(),

      nationalIdBack: Joi.object({
        url: Joi.string().required(),
        publicId: Joi.string().required(),
      }).required(),

      drivingLicense: Joi.object({
        url: Joi.string().required(),
        publicId: Joi.string().required(),
      }).required(),

      motorcycleLicense: Joi.object({
        url: Joi.string().required(),
        publicId: Joi.string().required(),
      }).required(),
    });

    const body = validate(schema, req.body);

    // Check if there is already an approved user
    const existingUser = await User.findOne({
      phone: body.phone,
      isDeleted: { $ne: true },
    });

    if (existingUser) {
      return ApiResponse.error(res, "رقم الهاتف مستخدم بالفعل", 400);
    }

    // Search previous application by phone
    let application = await DelegateApplication.findOne({
      phone: body.phone,
    });

    // Still pending
    if (application && application.status === "pending") {
      return ApiResponse.error(res, "لديك طلب قيد المراجعة بالفعل", 400);
    }

    // Rejected -> Update same application
    if (application && application.status === "rejected") {
      // Delete old images from Cloudinary
      const oldImages = [
        application.nationalIdFront,
        application.nationalIdBack,
        application.drivingLicense,
        application.motorcycleLicense,
      ];

      for (const image of oldImages) {
        if (image?.publicId) {
          try {
            await deleteImage(image.publicId);
          } catch (err) {
            console.error("Cloudinary delete error:", err.message);
          }
        }
      }

      application.name = body.name;
      application.email = body.email;
      application.password = body.password;

      application.nationalIdFront = body.nationalIdFront;
      application.nationalIdBack = body.nationalIdBack;
      application.drivingLicense = body.drivingLicense;
      application.motorcycleLicense = body.motorcycleLicense;

      application.status = "pending";
      application.rejectReason = null;
      application.reviewedAt = null;
      application.reviewedBy = null;
      application.rejectedAt = null;

      await application.save();

      return ApiResponse.success(
        res,
        "تم إعادة إرسال طلب الانضمام بنجاح",
        { application },
        200,
      );
    }

    // Create new application
    application = new DelegateApplication({
      name: body.name,
      phone: body.phone,
      email: body.email,
      password: body.password,

      nationalIdFront: body.nationalIdFront,
      nationalIdBack: body.nationalIdBack,
      drivingLicense: body.drivingLicense,
      motorcycleLicense: body.motorcycleLicense,
    });

    await application.save();

    return ApiResponse.success(
      res,
      "تم إرسال طلب الانضمام بنجاح، وسيتم مراجعته من الإدارة",
      { application },
      201,
    );
  } catch (error) {
    next(error);
  }
};
/**
 * @desc    Delegate Login
 * @route   POST /api/auth/delegate/login
 * @access  Public
 */
exports.delegateLogin = async (req, res, next) => {
  try {
    const schema = Joi.object({
      phone: Joi.string().required(),
      password: Joi.string().required(),
    });

    const body = validate(schema, req.body);

    // Check approved delegate account
    const user = await User.findOne({
      phone: body.phone,
      role: "delegate",
      isDeleted: { $ne: true },
    });

    if (user) {
      if (!user.isActive) {
        const err = new Error("تم إيقاف حساب المندوب");
        err.statusCode = 403;
        return next(err);
      }

      const isMatch = await user.comparePassword(body.password);

      if (!isMatch) {
        const err = new Error("رقم الهاتف أو كلمة المرور غير صحيحة");
        err.statusCode = 401;
        return next(err);
      }

      const accessToken = generateAccessToken(user);
      const refreshToken = generateRefreshToken(user);

      user.refreshTokens.push(refreshToken);
      await user.save();

      return ApiResponse.success(
        res,
        "تم تسجيل الدخول بنجاح",
        {
          user: {
            id: user._id,
            name: user.name,
            phone: user.phone,
            email: user.email,
            role: user.role,
            isVerified: user.isVerified,
            isActive: user.isActive,
          },
          accessToken,
          refreshToken,
        },
        200,
      );
    }

    // Check delegate application
    const application = await DelegateApplication.findOne({
      phone: body.phone,
    }).select("+password");

    if (!application) {
      const err = new Error("رقم الهاتف أو كلمة المرور غير صحيحة");
      err.statusCode = 401;
      return next(err);
    }

    const isMatch = await application.comparePassword(body.password);

    if (!isMatch) {
      const err = new Error("رقم الهاتف أو كلمة المرور غير صحيحة");
      err.statusCode = 401;
      return next(err);
    }

    if (application.status === "pending") {
      return ApiResponse.success(res, "طلب الانضمام مازال قيد المراجعة", {
        status: "pending",
      });
    }

    if (application.status === "rejected") {
      return ApiResponse.success(res, "تم رفض طلب الانضمام", {
        status: "rejected",
        rejectReason: application.rejectReason,
        rejectedAt: application.rejectedAt,
      });
    }

    const err = new Error("لا يمكن تسجيل الدخول");
    err.statusCode = 400;
    return next(err);
  } catch (error) {
    next(error);
  }
};

exports.sendOtp = async (req, res, next) => {
  try {
    const schema = Joi.object({
      phone: Joi.string().required(),
      type: Joi.string().valid("reset_password").required(), // ✅ Only reset_password now
    });

    const body = validate(schema, req.body);

    // Generate new OTP
    const otpCode = generateOTP();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

    // Delete existing unused OTPs of the same type for this phone to clean up
    await OTP.deleteMany({ phone: body.phone, type: body.type });

    const otp = new OTP({
      phone: body.phone,
      code: otpCode,
      type: body.type,
      expiresAt,
    });
    await otp.save();

    await sendSMS(body.phone, `رمز التحقق الخاص بك هو: ${otpCode}`);

    return ApiResponse.success(res, "تم إرسال رمز التحقق بنجاح");
  } catch (error) {
    next(error);
  }
};

// Verify OTP for password reset only
// ✅ REFACTOR: Registration OTP removed - this is only for reset_password flow
exports.verifyOtp = async (req, res, next) => {
  try {
    const schema = Joi.object({
      phone: Joi.string().required(),
      code: Joi.string().required(),
      type: Joi.string().valid("reset_password").required(), // ✅ Only reset_password now
    });

    const body = validate(schema, req.body);

    const otp = await OTP.findOne({
      phone: body.phone,
      code: body.code,
      type: body.type,
      expiresAt: { $gt: new Date() },
      isUsed: false,
    });

    if (!otp) {
      const error = new Error("رمز التحقق غير صحيح أو منتهي الصلاحية");
      error.statusCode = 400;
      return next(error);
    }

    // Mark OTP as used
    otp.isUsed = true;
    await otp.save();

    return ApiResponse.success(res, "تم التحقق من الرمز بنجاح", {
      phone: body.phone,
      verified: true,
    });
  } catch (error) {
    next(error);
  }
};

// Forgot Password Request
exports.forgotPassword = async (req, res, next) => {
  try {
    const schema = Joi.object({
      phone: Joi.string().required(),
    });

    const { phone } = validate(schema, req.body);

    const user = await User.findOne({ phone });
    if (!user) {
      const error = new Error("رقم الهاتف غير مسجل لدينا");
      error.statusCode = 404;
      return next(error);
    }

    if (!user.email) {
      const error = new Error(
        "لا يوجد بريد إلكتروني مسجل لهذا الحساب لإرسال رمز التحقق",
      );
      error.statusCode = 400;
      return next(error);
    }

    // Generate reset OTP
    const otpCode = generateOTP();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

    await OTP.deleteMany({ phone, type: "reset_password" });

    const otp = new OTP({
      phone,
      code: otpCode,
      type: "reset_password",
      expiresAt,
    });
    await otp.save();

    await sendEmail({
      email: user.email,
      subject: "إعادة تعيين كلمة المرور",
      message: `رمز إعادة تعيين كلمة المرور الخاص بك هو: ${otpCode}`,
    });

    return ApiResponse.success(
      res,
      "تم إرسال رمز إعادة تعيين كلمة المرور بنجاح إلى بريدك الإلكتروني",
    );
  } catch (error) {
    next(error);
  }
};

// Reset Password Execution
exports.resetPassword = async (req, res, next) => {
  try {
    const schema = Joi.object({
      phone: Joi.string().required(),
      code: Joi.string().required(),
      newPassword: Joi.string().min(6).required(),
    });

    const body = validate(schema, req.body);

    // Verify OTP
    const otp = await OTP.findOne({
      phone: body.phone,
      code: body.code,
      type: "reset_password",
      expiresAt: { $gt: new Date() },
      isUsed: false,
    });

    if (!otp) {
      const error = new Error("رمز التحقق غير صحيح أو منتهي الصلاحية");
      error.statusCode = 400;
      return next(error);
    }

    // Mark OTP as used
    otp.isUsed = true;
    await otp.save();

    // Find and update user password
    const user = await User.findOne({ phone: body.phone });
    if (!user) {
      const error = new Error("المستخدم غير موجود");
      error.statusCode = 404;
      return next(error);
    }

    user.password = body.newPassword;
    // FIX #4: SECURITY - Clear all refresh tokens on password reset
    // Forces logout on all devices. Prevents token reuse attacks
    // if password is compromised.
    user.refreshTokens = []; // ✅ Force logout everywhere
    await user.save();

    return ApiResponse.success(res, "تم إعادة تعيين كلمة المرور بنجاح");
  } catch (error) {
    next(error);
  }
};
