const User = require("../models/user");
const Project = require("../models/project");
const {
  OtpServiceError,
  sendOtp,
  verifyOtp,
  normalizePhone,
  normalizeOtpChannel,
  normalizeOtpPurpose,
} = require("../services/otp.service");

const READ_ONLY_PROFILE_FIELDS = [
  "email",
  "role",
  "phoneNumber",
  "secondaryPhoneNumber",
];

/** @param {import("mongoose").Document} user */
function toPublicUser(user) {
  return {
    id: user._id,
    name: user.name,
    email: user.email,
    phoneNumber: user.phoneNumber ?? null,
    secondaryPhoneNumber: user.secondaryPhoneNumber ?? null,
    role: user.role,
  };
}

/** @param {unknown} err @param {import("express").Response} res @param {string} fallback */
function handleControllerError(err, res, fallback) {
  if (err instanceof OtpServiceError) {
    return res.status(err.statusCode).json({ message: err.message });
  }
  if (err.name === "ValidationError") {
    const messages = Object.values(err.errors).map((e) => e.message);
    return res.status(400).json({ message: messages.join(", ") });
  }
  return res.status(500).json({
    message: fallback,
    error: err.message,
  });
}

/**
 * @param {import("express").Request} req
 * @param {import("express").Response} res
 * @param {"secondary_phone" | "password_reset"} purpose
 */
async function handleSendOtp(req, res, purpose) {
  const channel = normalizeOtpChannel(
    req.body.channel ?? req.body.method ?? req.body.verificationChannel,
  );

  if (!channel) {
    return res.status(400).json({
      message:
        'channel is required (accepted: email, phone, sms, mail, mobile)',
    });
  }

  const userId = req.userId;
  const user = await User.findById(userId).select("-password");
  if (!user) {
    return res.status(404).json({ message: "User not found" });
  }

  if (purpose === "secondary_phone" && user.secondaryPhoneNumber) {
    return res.status(409).json({
      message: "Secondary phone number is already set and cannot be changed",
    });
  }

  const data = await sendOtp(userId, purpose, channel, user);

  res.json({
    message: "OTP sent successfully",
    success: true,
    data,
  });
}

const getProfile = async (req, res) => {
  try {
    const userId = req.userId;
    const user = await User.findById(userId).select("-password");

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json({
      message: "success",
      data: toPublicUser(user),
    });
  } catch (error) {
    res.status(500).json({
      message: "Get profile failed",
      error: error.message,
    });
  }
};

const updateProfile = async (req, res) => {
  try {
    const userId = req.userId;
    const { name } = req.body;

    const blockedField = READ_ONLY_PROFILE_FIELDS.find(
      (field) => req.body[field] !== undefined,
    );
    if (blockedField) {
      return res.status(400).json({
        message: `${blockedField} cannot be updated via this endpoint`,
      });
    }

    if (name === undefined) {
      return res.status(400).json({
        message: "Provide name to update",
      });
    }

    const trimmedName = String(name).trim();
    if (!trimmedName) {
      return res.status(400).json({ message: "Name cannot be empty" });
    }

    const user = await User.findByIdAndUpdate(
      userId,
      { name: trimmedName },
      { new: true, runValidators: true },
    ).select("-password");

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json({
      message: "Profile updated successfully",
      data: toPublicUser(user),
    });
  } catch (error) {
    handleControllerError(error, res, "Update profile failed");
  }
};

const sendSecondaryPhoneOtp = async (req, res) => {
  try {
    await handleSendOtp(req, res, "secondary_phone");
  } catch (error) {
    handleControllerError(error, res, "Send OTP failed");
  }
};

const sendProfileOtp = async (req, res) => {
  try {
    const purpose = normalizeOtpPurpose(
      req.body.purpose ?? req.body.type ?? req.body.action,
    );

    if (!purpose) {
      return res.status(400).json({
        message:
          'purpose is required (secondary_phone or password_reset)',
      });
    }

    await handleSendOtp(req, res, purpose);
  } catch (error) {
    handleControllerError(error, res, "Send OTP failed");
  }
};

const verifySecondaryPhone = async (req, res) => {
  try {
    const userId = req.userId;
    const { secondaryPhoneNumber, otp, code } = req.body;
    const otpCode = otp ?? code;

    if (!secondaryPhoneNumber || !otpCode) {
      return res.status(400).json({
        message: "secondaryPhoneNumber and otp are required",
      });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (user.secondaryPhoneNumber) {
      return res.status(409).json({
        message: "Secondary phone number is already set and cannot be changed",
      });
    }

    const normalizedSecondary = normalizePhone(secondaryPhoneNumber);
    if (!normalizedSecondary) {
      return res.status(400).json({
        message: "secondaryPhoneNumber cannot be empty",
      });
    }

    const normalizedPrimary = user.phoneNumber
      ? normalizePhone(user.phoneNumber)
      : null;

    if (normalizedPrimary && normalizedSecondary === normalizedPrimary) {
      return res.status(400).json({
        message: "Secondary phone number must differ from primary phone number",
      });
    }

    await verifyOtp(userId, "secondary_phone", otpCode);

    user.secondaryPhoneNumber = normalizedSecondary;
    await user.save();

    res.json({
      message: "Secondary phone number added successfully",
      data: toPublicUser(user),
    });
  } catch (error) {
    handleControllerError(error, res, "Verify secondary phone failed");
  }
};

const sendPasswordResetOtp = async (req, res) => {
  try {
    await handleSendOtp(req, res, "password_reset");
  } catch (error) {
    handleControllerError(error, res, "Send password reset OTP failed");
  }
};

const resetPasswordWithOtp = async (req, res) => {
  try {
    const userId = req.userId;
    const { otp, code, newPassword } = req.body;
    const otpCode = otp ?? code;

    if (!otpCode || !newPassword) {
      return res.status(400).json({
        message: "otp and newPassword are required",
      });
    }

    if (String(newPassword).length < 6) {
      return res.status(400).json({
        message: "New password must be at least 6 characters",
      });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    await verifyOtp(userId, "password_reset", otpCode);

    user.password = newPassword;
    await user.save();

    res.json({ message: "Password reset successfully" });
  } catch (error) {
    handleControllerError(error, res, "Password reset failed");
  }
};
const changePassword = async (req, res) => {
  try {
    const userId = req.userId;
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        message: "currentPassword and newPassword are required",
      });
    }

    if (String(newPassword).length < 6) {
      return res.status(400).json({
        message: "New password must be at least 6 characters",
      });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const match = await user.comparePassword(currentPassword);
    if (!match) {
      return res.status(401).json({ message: "Current password is incorrect" });
    }

    user.password = newPassword;
    await user.save();

    res.json({ message: "Password updated successfully" });
  } catch (error) {
    handleControllerError(error, res, "Change password failed");
  }
};
const register = async (req, res) => {
  try {
    const { name, email, password, phoneNumber } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({
        message: "Name, email, and password are required",
      });
    }

    const user = await User.create({
      name,
      email,
      password,
      phoneNumber: phoneNumber ? normalizePhone(phoneNumber) : undefined,
      role: "user",
    });

    const token = user.generateAuthToken();

    res.status(201).json({
      message: "success",
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phoneNumber: user.phoneNumber ?? null,
        secondaryPhoneNumber: user.secondaryPhoneNumber ?? null,
        role: user.role,
      },
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ message: "Email already registered" });
    }
    handleControllerError(error, res, "Registration failed");
  }
};
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        message: "Email and password are required",
      });
    }

    const user = await User.findOne({
      email:String(email).toLowerCase().trim(),
    });
    if (!user) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    const match = await user.comparePassword(password);
    if (!match) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    const token = user.generateAuthToken();

    res.json({
      message: "success",
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phoneNumber: user.phoneNumber ?? null,
        secondaryPhoneNumber: user.secondaryPhoneNumber ?? null,
        role: user.role,
      },
    });
  } catch (error) {
    handleControllerError(error, res, "Login failed");
  }
};
// Function to create an admin user with password '123456'
const createAdminUser = async (req, res) => {
  try {
    const isExits = await User.findOne({
      email: "admin@admin.com",
    });

    if (isExits) {
      return res.status(409).json({
        message: "Admin already exists",
      });
    }

    const admin = await User.create({
      name: "admin",
      email: "admin@admin.com",
      password: "123456",
      phoneNumber: "01553880080",
      role: "admin",
    });

    const token = admin.generateAuthToken();

    res.status(201).json({
      message: "Admin user created successfully",
      token,
      user: {
        id: admin._id,
        name: admin.name,
        email: admin.email,
        phoneNumber: admin.phoneNumber ?? null,
        role: admin.role,
      },
    });
  } catch (error) {
    res.status(500).json({
      message: "Admin creation failed",
      error: error.message,
    });
  }
};

const getAllUsersForAdmin = async (req, res) => {
  try {
    if (req.role !== "admin") {
      return res.status(403).json({
        message: "Admin access required",
      });
    }

    const users = await User.find()
      .select("-password")
      .sort({ name: 1 })
      .lean();

    const projectCounts = await Project.aggregate([
      {
        $group: {
          _id: "$userId",
          projectCount: { $sum: 1 },
        },
      },
    ]);

    const countByUserId = new Map(
      projectCounts.map((row) => [String(row._id), row.projectCount]),
    );

    const data = users.map((user) => ({
      id: user._id,
      name: user.name,
      email: user.email,
      phoneNumber: user.phoneNumber ?? null,
      role: user.role,
      projectCount: countByUserId.get(String(user._id)) ?? 0,
    }));

    res.json({
      message: "success",
      count: data.length,
      data,
    });
  } catch (error) {
    res.status(500).json({
      message: "Get users failed",
      error: error.message,
    });
  }
};

module.exports = {
  getProfile,
  updateProfile,
  changePassword,
  sendSecondaryPhoneOtp,
  sendProfileOtp,
  verifySecondaryPhone,
  sendPasswordResetOtp,
  resetPasswordWithOtp,
  register,
  login,
  createAdminUser,
  getAllUsersForAdmin,
};