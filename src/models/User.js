const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const AddressSchema = new mongoose.Schema({
  label: { type: String },
  address: { type: String },
  city: { type: String },
  coordinates: {
    lat: { type: Number },
    lng: { type: Number },
  },
});

const ImageSchema = new mongoose.Schema(
  {
    url: {
      type: String,
    },
    publicId: {
      type: String,
    },
  },
  { _id: false },
);

const UserSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Name is required"],
    },

    phone: {
      type: String,
      required: [true, "Phone number is required"],
      unique: true,
      trim: true,
    },

    email: {
      type: String,
      sparse: true,
      trim: true,
      lowercase: true,
    },

    password: {
      type: String,
      required: [true, "Password is required"],
      select: true,
    },

    role: {
      type: String,
      enum: ["client", "delegate", "admin", "center"],
      default: "client",
    },

    avatar: {
      type: String,
    },

    // Delegate Documents
    nationalIdFront: ImageSchema,

    nationalIdBack: ImageSchema,

    drivingLicense: ImageSchema,

    motorcycleLicense: ImageSchema,

    isActive: {
      type: Boolean,
      default: true,
    },

    isVerified: {
      type: Boolean,
      default: false,
    },

    addresses: [AddressSchema],

    refreshTokens: [{ type: String }],

    // Soft Delete
    isDeleted: {
      type: Boolean,
      default: false,
    },

    deletedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  },
);

// Hash password before saving
UserSchema.pre("save", async function (next) {
  if (!this.isModified("password")) {
    return next();
  }

  // Password already hashed (Delegate Approval)
  if (this.$locals?.passwordAlreadyHashed) {
    return next();
  }

  try {
    const salt = await bcrypt.genSalt(10);

    this.password = await bcrypt.hash(this.password, salt);

    next();
  } catch (error) {
    next(error);
  }
});

// Compare Password
UserSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

// Indexes
UserSchema.index({ role: 1 });
UserSchema.index({ createdAt: -1 });
UserSchema.index({ isDeleted: 1 });
UserSchema.index({ deletedAt: 1 });

module.exports = mongoose.model("User", UserSchema);
