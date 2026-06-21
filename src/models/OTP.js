const mongoose = require("mongoose");

const OTPSchema = new mongoose.Schema(
  {
    phone: {
      type: String,
      trim: true,
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
    },
    code: {
      type: String,
      required: [true, "OTP code is required"],
      trim: true,
    },
    type: {
      type: String,
      enum: [
        "verify_phone",
        "verify_email",
        "reset_password",
        "pickup_confirm",
        "delivery_confirm",
      ],
      required: true,
    },
    expiresAt: {
      type: Date,
      required: true,
    },
    isUsed: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  },
);

// TTL index to automatically delete expired documents
OTPSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Indexes for performance
OTPSchema.index({ phone: 1 });
OTPSchema.index({ email: 1 });
OTPSchema.index({ type: 1 });

module.exports = mongoose.model("OTP", OTPSchema);
