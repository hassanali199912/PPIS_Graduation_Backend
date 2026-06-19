const nodemailer = require("nodemailer");

/** @type {import("nodemailer").Transporter | null} */
let cachedTransporter = null;

function isResendConfigured() {
  return Boolean(process.env.RESEND_API_KEY);
}

function isSmtpConfigured() {
  return Boolean(
    process.env.SMTP_HOST &&
      process.env.SMTP_USER &&
      process.env.SMTP_PASS,
  );
}

function isSmsConfigured() {
  return Boolean(
    process.env.TWILIO_ACCOUNT_SID &&
      process.env.TWILIO_AUTH_TOKEN &&
      process.env.TWILIO_PHONE_NUMBER,
  );
}

function canUseEthereal() {
  return (
    process.env.NODE_ENV !== "production" ||
    process.env.OTP_USE_ETHEREAL === "true"
  );
}

function isEmailConfigured() {
  return isResendConfigured() || isSmtpConfigured() || canUseEthereal();
}

/**
 * @param {"secondary_phone" | "password_reset"} purpose
 */
function getOtpCopy(purpose) {
  if (purpose === "secondary_phone") {
    return {
      subject: "رمز التحقق — إضافة رقم هاتف إضافي",
      title: "إضافة رقم هاتف إضافي",
      body: "استخدم الرمز التالي لإضافة رقم هاتف إضافي إلى حسابك.",
    };
  }

  return {
    subject: "رمز التحقق — إعادة تعيين كلمة المرور",
    title: "إعادة تعيين كلمة المرور",
    body: "استخدم الرمز التالي لإعادة تعيين كلمة مرور حسابك.",
  };
}

function buildOtpHtml(copy, otp) {
  return `
    <div dir="rtl" style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto;">
      <h2 style="color: #1a1a1a;">${copy.title}</h2>
      <p style="color: #444;">${copy.body}</p>
      <div style="background: #f4f4f5; border-radius: 8px; padding: 20px; text-align: center; margin: 24px 0;">
        <span style="font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #111;">${otp}</span>
      </div>
      <p style="color: #888; font-size: 13px;">صالح لمدة 10 دقائق. لا تشارك هذا الرمز مع أحد.</p>
    </div>
  `;
}

async function sendViaResend(email, otp, purpose) {
  const copy = getOtpCopy(purpose);
  const from = process.env.RESEND_FROM || "onboarding@resend.dev";

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: [email],
      subject: copy.subject,
      text: `${copy.title}\n\n${copy.body}\n\nرمز التحقق: ${otp}\n\nصالح لمدة 10 دقائق.`,
      html: buildOtpHtml(copy, otp),
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("[OTP][RESEND] send failed:", errorText);
    throw new Error("EMAIL_SEND_FAILED");
  }

  return { provider: "resend" };
}

async function getMailTransporter() {
  if (cachedTransporter) return cachedTransporter;

  if (isSmtpConfigured()) {
    cachedTransporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT || 587),
      secure: process.env.SMTP_SECURE === "true",
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
    return cachedTransporter;
  }

  if (canUseEthereal()) {
    const testAccount = await nodemailer.createTestAccount();
    cachedTransporter = nodemailer.createTransport({
      host: "smtp.ethereal.email",
      port: 587,
      secure: false,
      auth: {
        user: testAccount.user,
        pass: testAccount.pass,
      },
    });
    return cachedTransporter;
  }

  throw new Error("EMAIL_NOT_CONFIGURED");
}

async function sendViaSmtp(email, otp, purpose) {
  const transporter = await getMailTransporter();
  const copy = getOtpCopy(purpose);
  const from =
    process.env.SMTP_FROM ||
    process.env.SMTP_USER ||
    "noreply@localhost";

  const info = await transporter
    .sendMail({
      from,
      to: email,
      subject: copy.subject,
      text: `${copy.title}\n\n${copy.body}\n\nرمز التحقق: ${otp}\n\nصالح لمدة 10 دقائق.`,
      html: buildOtpHtml(copy, otp),
    })
    .catch((err) => {
      console.error("[OTP][SMTP] send failed:", err.message);
      throw new Error("EMAIL_SEND_FAILED");
    });

  const previewUrl = nodemailer.getTestMessageUrl(info);
  if (previewUrl) {
    console.log(`[OTP][EMAIL][PREVIEW] ${previewUrl}`);
  }

  return {
    provider: isSmtpConfigured() ? "smtp" : "ethereal",
    previewUrl: previewUrl || undefined,
  };
}

/**
 * @param {string} email
 * @param {string} otp
 * @param {"secondary_phone" | "password_reset"} purpose
 */
async function sendEmailOtp(email, otp, purpose) {
  if (!isEmailConfigured()) {
    throw new Error("EMAIL_NOT_CONFIGURED");
  }

  if (isResendConfigured()) {
    return sendViaResend(email, otp, purpose);
  }

  return sendViaSmtp(email, otp, purpose);
}

function toE164Phone(phone) {
  const digits = String(phone).replace(/\D/g, "");
  if (!digits) return "";

  if (digits.startsWith("20")) return `+${digits}`;
  if (digits.startsWith("0")) return `+20${digits.slice(1)}`;
  if (digits.length === 10 || digits.length === 11) {
    return `+20${digits.replace(/^0/, "")}`;
  }

  return digits.startsWith("+") ? digits : `+${digits}`;
}

/**
 * @param {string} phoneNumber
 * @param {string} otp
 * @param {"secondary_phone" | "password_reset"} purpose
 */
async function sendSmsOtp(phoneNumber, otp, purpose) {
  if (!isSmsConfigured()) {
    throw new Error("SMS_NOT_CONFIGURED");
  }

  const to = toE164Phone(phoneNumber);
  if (!to) {
    throw new Error("INVALID_PHONE");
  }

  const label =
    purpose === "secondary_phone"
      ? "إضافة رقم هاتف"
      : "إعادة تعيين كلمة المرور";

  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const from = process.env.TWILIO_PHONE_NUMBER;
  const url = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;
  const auth = Buffer.from(`${accountSid}:${authToken}`).toString("base64");

  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      To: to,
      From: from,
      Body: `رمز التحقق (${label}): ${otp}. صالح 10 دقائق.`,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("[OTP][SMS] Twilio error:", errorText);
    throw new Error("SMS_SEND_FAILED");
  }

  return { provider: "twilio" };
}

module.exports = {
  sendEmailOtp,
  sendSmsOtp,
  isSmtpConfigured,
  isSmsConfigured,
  isResendConfigured,
  isEmailConfigured,
};
