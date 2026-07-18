const mongoose = require("mongoose");

const SettlementSchema = new mongoose.Schema(
  {
    order: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Order",
      required: [true, "Order reference is required"],
    },
    recipient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Recipient is required"],
    },
    recipientName: {
      type: String,
      trim: true,
      default: "",
    },
    recipientType: {
      type: String,
      enum: ["center", "delegate", "admin"],
      required: [true, "Recipient type is required"],
    },
    orderNumber: {
      type: String,
      trim: true,
      default: "",
    },
    amount: {
      type: Number,
      required: [true, "Settlement amount is required"],
      min: 0,
    },
    stage: {
      type: String,
      enum: ["pickup", "delivery", "repair", "admin"],
      required: true,
    },
    paymentStatus: {
      type: String,
      enum: ["pending", "paid"],
      default: "pending",
    },
    status: {
      type: String,
      enum: ["pending", "processed", "paid", "failed"],
      default: "pending",
    },
    paidAt: {
      type: Date,
      default: null,
    },
    paidBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    notes: {
      type: String,
      trim: true,
      default: "",
    },
  },
  {
    timestamps: true,
  },
);

SettlementSchema.index({ order: 1, status: 1 });
SettlementSchema.index({ recipientType: 1, status: 1 });
SettlementSchema.index({ createdAt: -1 });

module.exports = mongoose.model("Settlement", SettlementSchema);
