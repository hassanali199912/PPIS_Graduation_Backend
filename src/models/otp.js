const mongoose = require("mongoose");

const OTP_PURPOSES = ["secondary_phone", "password_reset"];
const OTP_CHANNELS = ["email", "phone"];

const otpSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    purpose: {
      type: String,
      enum: OTP_PURPOSES,
      required: true,
    },
    channel: {
      type: String,
      enum: OTP_CHANNELS,
      required: true,
    },
    otpHash: {
      type: String,
      required: true,
    },
    expiresAt: {
      type: Date,
      required: true,
    },
    verifyAttempts: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true },
);

otpSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
otpSchema.index({ userId: 1, purpose: 1 });

const Otp = mongoose.model("Otp", otpSchema);

module.exports = {
  Otp,
  OTP_PURPOSES,
  OTP_CHANNELS,
};
