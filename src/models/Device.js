/**
 * ⚠️ DEPRECATED: Device Model
 *
 * This model is no longer actively used in the application.
 * The Order model embeds device information directly within the order document
 * using the order.device sub-document structure.
 *
 * This model is kept for backward compatibility and data archival purposes.
 *
 * Planned for removal in v2.0. Any new device-related logic should be added
 * to the Order.device embedded object instead.
 *
 * For more information, see PRODUCTION_HARDENING_REPORT.md section on Device Model
 */

const mongoose = require("mongoose");

const DeviceSchema = new mongoose.Schema(
  {
    order: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Order",
      required: [true, "Order reference is required"],
    },
    type: {
      type: String,
      required: [true, "Device type is required"],
      enum: ["phone", "tablet", "laptop", "smartwatch", "headphones", "other"],
    },
    brand: {
      type: String,
      required: [true, "Device brand is required"],
    },
    model: {
      type: String,
      required: [true, "Device model is required"],
    },
    color: String,
    serialNumber: String,
    imei: String,
    problemType: {
      type: String,
      required: [true, "Problem type is required"],
      enum: [
        "screen",
        "battery",
        "camera",
        "charging",
        "speaker",
        "microphone",
        "water-damage",
        "physical-damage",
        "software",
        "other",
      ],
    },
    problemDescription: {
      type: String,
      required: [true, "Problem description is required"],
    },
    images: [
      {
        url: String,
        uploadedAt: { type: Date, default: Date.now },
      },
    ],
    assessmentNotes: String,
    estimatedRepairCost: Number,
    status: {
      type: String,
      enum: [
        "received",
        "assessing",
        "assessed",
        "in-repair",
        "repaired",
        "ready-for-pickup",
      ],
      default: "received",
    },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
  },
  { timestamps: true },
);

module.exports = mongoose.model("Device", DeviceSchema);
