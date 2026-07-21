const mongoose = require("mongoose");

const SystemSettingSchema = new mongoose.Schema(
  {
    key: {
      type: String,
      default: "default",
      unique: true,
      trim: true,
    },
    currency: {
      type: String,
      trim: true,
      default: "IQD",
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    walletOwnerName: {
      type: String,
      trim: true,
      default: "",
    },
    walletNumbers: {
      type: Map,
      of: String,
      default: {},
    },
    paymentInstructions: {
      type: String,
      trim: true,
      default: "",
    },
    activePaymentMethods: {
      type: [String],
      enum: [
        "zain_cash",
        "western_union",
        "visa",
        "cash",
        "asia_pay",
        "mastercard",
      ],
      default: ["zain_cash"],
    },
    commissionType: {
      type: String,
      enum: ["percentage", "fixed"],
      default: "percentage",
    },
    commissionValue: {
      type: Number,
      default: 0,
      min: 0,
    },
    delegateFeeType: {
      type: String,
      enum: ["percentage", "fixed"],
      default: "fixed",
    },
    delegateFeeValue: {
      type: Number,
      default: 0,
      min: 0,
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    updatedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  },
);

SystemSettingSchema.index({ key: 1 }, { unique: true });
SystemSettingSchema.index({ updatedAt: -1 });

module.exports = mongoose.model("SystemSetting", SystemSettingSchema);
