const bcrypt = require("bcryptjs");
const { Otp } = require("../models/otp");
const {
  sendEmailOtp,
  sendSmsOtp,
  isSmsConfigured,
  isEmailConfigured,
} = require("./notification.service");

const OTP_EXPIRY_MS = 10 * 60 * 1000;
const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000;
const RATE_LIMIT_MAX_SENDS = 3;
const MAX_VERIFY_ATTEMPTS = 5;

class OtpServiceError extends Error {
  /** @param {string} message @param {number} [statusCode] */
  constructor(message, statusCode = 400) {
    super(message);
    this.name = "OtpServiceError";
    this.statusCode = statusCode;
  }
}

function generateOtpCode() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

/**
 * @param {unknown} channel
 * @returns {"email" | "phone" | null}
 */
function normalizeOtpChannel(channel) {
  const value = String(channel ?? "")
    .trim()
    .toLowerCase();

  if (["email", "mail", "e-mail"].includes(value)) return "email";
  if (["phone", "sms", "mobile", "whatsapp"].includes(value)) return "phone";
  return null;
}

/**
 * @param {unknown} purpose
 * @returns {"secondary_phone" | "password_reset" | null}
 */
function normalizeOtpPurpose(purpose) {
  const value = String(purpose ?? "")
    .trim()
    .toLowerCase();

  if (
    ["secondary_phone", "add_secondary_phone", "secondary", "secondary-phone"].includes(
      value,
    )
  ) {
    return "secondary_phone";
  }

  if (
    ["password_reset", "reset_password", "password", "forgot_password"].includes(
      value,
    )
  ) {
    return "password_reset";
  }

  return null;
}

/**
 * @param {string} channel
 * @param {string} email
 * @param {string | null | undefined} phoneNumber
 * @param {string} otp
 * @param {"secondary_phone" | "password_reset"} purpose
 */
async function deliverOtp({ channel, email, phoneNumber, otp, purpose }) {
  if (!email?.trim()) {
    throw new OtpServiceError("Account email is missing", 400);
  }

  if (channel === "email") {
    if (!isEmailConfigured()) {
      throw new OtpServiceError(
        "Email service is not configured. Add RESEND_API_KEY or SMTP settings.",
        503,
      );
    }

    const result = await sendEmailOtp(email, otp, purpose);
    console.log(`[OTP][EMAIL] Sent to ${email} | Purpose: ${purpose}`);
    return { deliveredVia: "email", ...result };
  }

  if (!phoneNumber?.trim()) {
    throw new OtpServiceError(
      "Primary phone number is not set on this account",
      400,
    );
  }

  if (isSmsConfigured()) {
    await sendSmsOtp(phoneNumber, otp, purpose);
    console.log(`[OTP][SMS] Sent to ${phoneNumber} | Purpose: ${purpose}`);
    return { deliveredVia: "phone" };
  }

  if (!isEmailConfigured()) {
    throw new OtpServiceError(
      "SMS is not configured and email fallback is unavailable",
      503,
    );
  }

  console.warn(
    `[OTP] SMS not configured — sending OTP to email fallback (${email})`,
  );
  const result = await sendEmailOtp(email, otp, purpose);
  return {
    deliveredVia: "email",
    requestedChannel: "phone",
    fallback: true,
    ...result,
  };
}

/**
 * @param {import("mongoose").Types.ObjectId | string} userId
 * @param {"secondary_phone" | "password_reset"} purpose
 * @param {"email" | "phone"} channel
 * @param {{ email: string; phoneNumber?: string | null }} user
 */
async function sendOtp(userId, purpose, channel, user) {
  const windowStart = new Date(Date.now() - RATE_LIMIT_WINDOW_MS);
  const recentSends = await Otp.countDocuments({
    userId,
    purpose,
    createdAt: { $gte: windowStart },
  });

  if (recentSends >= RATE_LIMIT_MAX_SENDS) {
    throw new OtpServiceError(
      "Too many OTP requests. Please try again in 15 minutes",
      429,
    );
  }

  const code = generateOtpCode();
  const otpHash = await bcrypt.hash(code, 10);
  const expiresAt = new Date(Date.now() + OTP_EXPIRY_MS);

  let deliveryMeta = {};
  try {
    deliveryMeta = await deliverOtp({
      channel,
      email: user.email,
      phoneNumber: user.phoneNumber,
      otp: code,
      purpose,
    });

    if (process.env.NODE_ENV !== "production") {
      console.log(
        `[OTP][DEV] Code via ${deliveryMeta.deliveredVia}: ${code}`,
      );
    }
  } catch (error) {
    if (error instanceof OtpServiceError) throw error;

    console.error("[OTP] Delivery failed:", error.message);
    throw new OtpServiceError(
      "Failed to send verification code. Please try again later.",
      502,
    );
  }

  await Otp.deleteMany({ userId, purpose });

  await Otp.create({
    userId,
    purpose,
    channel: deliveryMeta.deliveredVia === "phone" ? "phone" : "email",
    otpHash,
    expiresAt,
  });

  return {
    channel: deliveryMeta.deliveredVia,
    expiresInMinutes: OTP_EXPIRY_MS / 60000,
    ...(deliveryMeta.fallback ? { fallback: true } : {}),
    ...(deliveryMeta.previewUrl ? { previewUrl: deliveryMeta.previewUrl } : {}),
  };
}

/**
 * @param {import("mongoose").Types.ObjectId | string} userId
 * @param {"secondary_phone" | "password_reset"} purpose
 * @param {string} code
 */
async function verifyOtp(userId, purpose, code) {
  const otpDoc = await Otp.findOne({ userId, purpose }).sort({
    createdAt: -1,
  });

  if (!otpDoc) {
    throw new OtpServiceError(
      "No active OTP found. Please request a new code",
      400,
    );
  }

  if (otpDoc.expiresAt.getTime() < Date.now()) {
    await Otp.deleteOne({ _id: otpDoc._id });
    throw new OtpServiceError("OTP has expired. Please request a new code", 400);
  }

  if (otpDoc.verifyAttempts >= MAX_VERIFY_ATTEMPTS) {
    await Otp.deleteOne({ _id: otpDoc._id });
    throw new OtpServiceError(
      "Too many invalid attempts. Please request a new code",
      429,
    );
  }

  const isValid = await bcrypt.compare(String(code).trim(), otpDoc.otpHash);

  if (!isValid) {
    otpDoc.verifyAttempts += 1;
    await otpDoc.save();
    throw new OtpServiceError("Invalid OTP code", 401);
  }

  await Otp.deleteOne({ _id: otpDoc._id });
  return { channel: otpDoc.channel };
}

function normalizePhone(phone) {
  return String(phone).trim().replace(/\s+/g, "");
}

module.exports = {
  OtpServiceError,
  sendOtp,
  verifyOtp,
  normalizePhone,
  normalizeOtpChannel,
  normalizeOtpPurpose,
  OTP_EXPIRY_MS,
};
