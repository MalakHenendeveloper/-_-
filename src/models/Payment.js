const mongoose = require("mongoose");

const PaymentSchema = new mongoose.Schema(
  {
    order: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Order",
      required: [true, "Order reference is required"],
      unique: true,
    },
    client: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Client reference is required"],
    },
    amount: {
      type: Number,
      required: [true, "Payment amount is required"],
      min: 0,
    },
    paymentMethod: {
      type: String,
      enum: [
        "zain_cash",
        "western_union",
        "visa",
        "cash",
        "asia_pay",
        "mastercard",
      ],
      default: "zain_cash",
    },
    senderWalletNumber: {
      type: String,
      trim: true,
      required: [true, "رقم المحفظة أو الحساب المرسل منه مطلوب"],
    },
    transferReference: {
      type: String,
      trim: true,
      required: [true, "رقم التحويل مطلوب"],
    },
    screenshot: {
      type: String,
      default: null,
    },
    status: {
      type: String,
      enum: ["waiting_confirmation", "confirmed", "rejected"],
      default: "waiting_confirmation",
    },
    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    reviewedAt: {
      type: Date,
      default: null,
    },
    rejectionReason: {
      type: String,
      trim: true,
      default: null,
    },
    notes: {
      type: String,
      trim: true,
      default: null,
    },
  },
  {
    timestamps: true,
  },
);

PaymentSchema.index({ order: 1, status: 1 });
PaymentSchema.index({ client: 1, createdAt: -1 });
PaymentSchema.index({ status: 1, createdAt: -1 });

module.exports = mongoose.model("Payment", PaymentSchema);
