const User = require("../models/user");

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
      phoneNumber,
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
        role: user.role,
      },
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ message: "Email already registered" });
    }
    if (error.name === "ValidationError") {
      const messages = Object.values(error.errors).map((e) => e.message);
      return res.status(400).json({ message: messages.join(", ") });
    }
    res.status(500).json({
      message: "Registration failed",
      error: error.message,
    });
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
        role: user.role,
      },
    });
  } catch (error) {
    res.status(500).json({
      message: "Login failed",
      error: error.message,
    });
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

module.exports = {
  register,
  login,
  createAdminUser,
};
