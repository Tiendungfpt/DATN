import User from "../models/User.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import { sendResetPasswordEmail } from "../services/emailService.js";

// REGISTER
export const registerUser = async (req, res) => {
  try {
    const { name, email, password, role } = req.body;

    if (!name || !email) {
      return res.status(400).json({ message: "Thiếu name hoặc email" });
    }

    if (!password || String(password).length < 6) {
      return res.status(400).json({
        message: "Mật khẩu tối thiểu 6 ký tự",
      });
    }

    const existed = await User.findOne({
      email: String(email).trim().toLowerCase(),
    });

    if (existed) {
      return res.status(409).json({ message: "Email đã được đăng ký" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = await User.create({
      name: name.trim(),
      email: String(email).trim().toLowerCase(),
      password: hashedPassword,
      role: role === "admin" ? "admin" : "user",
    });

    const userObj = newUser.toObject();
    delete userObj.password;

    res.status(201).json(userObj);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// UPDATE ROLE
export const updateRole = async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { role: req.body.role },
      { new: true },
    ).select("-password");

    res.json({ message: "Cập nhật role thành công", user });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const loginUser = async (req, res) => {
  try {
    const JWT_SECRET = process.env.JWT_SECRET || "khoa";
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        message: "Vui lòng nhập email và mật khẩu",
      });
    }

    const user = await User.findOne({
      email: String(email).trim().toLowerCase(),
    }).select("+password");

    if (!user) {
      return res.status(401).json({
        message: "Email hoặc mật khẩu không đúng",
      });
    }

    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.status(401).json({
        message: "Email hoặc mật khẩu không đúng",
      });
    }

    const token = jwt.sign({ id: user._id, role: user.role }, JWT_SECRET, {
      expiresIn: "7d",
    });

    const safeUser = user.toObject();
    delete safeUser.password;

    res.json({
      success: true,
      message: "Đăng nhập thành công",
      user: safeUser,
      token,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Lỗi server" });
  }
};

// GET PROFILE
export const getProfileUser = (req, res) => {
  res.json({ userId: req.userId });
};

// FORGOT PASSWORD
export const forgotPassword = async (req, res) => {
  try {
    const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:5173";
    const email = String(req.body.email || "")
      .trim()
      .toLowerCase();

    if (!email) {
      return res.status(400).json({ message: "Vui lòng nhập email" });
    }

    const user = await User.findOne({ email });

    // Trả về cùng một phản hồi để tránh lộ email tồn tại hay không.
    if (!user) {
      return res.json({
        message: "Nếu email tồn tại, chúng tôi đã gửi hướng dẫn đặt lại mật khẩu.",
      });
    }

    const rawToken = crypto.randomBytes(32).toString("hex");
    const hashedToken = crypto.createHash("sha256").update(rawToken).digest("hex");

    user.resetPasswordToken = hashedToken;
    user.resetPasswordExpires = Date.now() + 15 * 60 * 1000;
    await user.save();

    const resetUrl = `${FRONTEND_URL}/reset-password/${rawToken}`;

    try {
      await sendResetPasswordEmail({
        to: user.email,
        name: user.name,
        resetUrl,
      });
    } catch (mailError) {
      user.resetPasswordToken = null;
      user.resetPasswordExpires = null;
      await user.save();
      throw mailError;
    }

    res.json({
      message: "Nếu email tồn tại, chúng tôi đã gửi hướng dẫn đặt lại mật khẩu.",
    });
  } catch (error) {
    console.error("forgotPassword error:", error);
    res.status(500).json({ message: "Lỗi server" });
  }
};

// RESET PASSWORD
export const resetPassword = async (req, res) => {
  try {
    const { token } = req.params;
    const { password } = req.body;

    if (!password || String(password).length < 6) {
      return res.status(400).json({
        message: "Mật khẩu tối thiểu 6 ký tự",
      });
    }

    if (!token) {
      return res.status(400).json({ message: "Token không hợp lệ" });
    }

    const hashedToken = crypto.createHash("sha256").update(token).digest("hex");

    const user = await User.findOne({
      resetPasswordToken: hashedToken,
      resetPasswordExpires: { $gt: new Date() },
    });

    if (!user) {
      return res.status(400).json({
        message: "Liên kết đặt lại mật khẩu không hợp lệ hoặc đã hết hạn",
      });
    }

    user.password = await bcrypt.hash(password, 10);
    user.resetPasswordToken = null;
    user.resetPasswordExpires = null;
    await user.save();

    res.json({ message: "Đặt lại mật khẩu thành công" });
  } catch (error) {
    res.status(500).json({ message: "Lỗi server" });
  }
};
