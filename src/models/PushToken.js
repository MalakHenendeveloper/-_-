const mongoose = require("mongoose");

const PushTokenSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    token: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    platform: {
      type: String,
      enum: ["android"],
      default: "android",
    },
  },
  { timestamps: true },
);

module.exports = mongoose.model("PushToken", PushTokenSchema);
