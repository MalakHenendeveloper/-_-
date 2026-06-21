const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const AddressSchema = new mongoose.Schema({
  label: { type: String }, // البيت، العمل...
  address: { type: String },
  city: { type: String },
  coordinates: {
    lat: { type: Number },
    lng: { type: Number },
  },
});

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
      unique: true,
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
    // FIX #5: SOFT DELETE - Enable data recovery
    isDeleted: { type: Boolean, default: false },
    deletedAt: { type: Date, default: null },
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
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Compare password method
UserSchema.methods.comparePassword = async function (candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// Indexes for performance
// Phone and email already have unique indexes from field definitions
UserSchema.index({ role: 1 });
UserSchema.index({ createdAt: -1 });
// FIX #5: SOFT DELETE - Add indexes for soft delete queries
UserSchema.index({ isDeleted: 1 });
UserSchema.index({ deletedAt: 1 });

module.exports = mongoose.model("User", UserSchema);
