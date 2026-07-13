const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const ImageSchema = new mongoose.Schema(
  {
    url: {
      type: String,
      required: true,
    },
    publicId: {
      type: String,
      required: true,
    },
  },
  { _id: false },
);

const DelegateApplicationSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },

    phone: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },

    email: {
      type: String,
      sparse: true,
      lowercase: true,
      trim: true,
    },

    password: {
      type: String,
      required: true,
      select: true,
    },

    nationalIdFront: {
      type: ImageSchema,
      default: null,
    },

    nationalIdBack: {
      type: ImageSchema,
      default: null,
    },

    drivingLicense: {
      type: ImageSchema,
      default: null,
    },

    motorcycleLicense: {
      type: ImageSchema,
      default: null,
    },

    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
    },

    rejectReason: {
      type: String,
      default: null,
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

    rejectedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  },
);

DelegateApplicationSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();

  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);

  next();
});

DelegateApplicationSchema.methods.comparePassword = async function (password) {
  return bcrypt.compare(password, this.password);
};


DelegateApplicationSchema.index({ status: 1 });

module.exports = mongoose.model(
  "DelegateApplication",
  DelegateApplicationSchema,
);
