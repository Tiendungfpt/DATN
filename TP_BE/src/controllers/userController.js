// controllers/userController.js
import User from "../models/User.js";
import bcrypt from "bcryptjs";

// Lấy thông tin profile
export const getUserProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id || req.userId)
      .select("-password");

    if (!user) {
      return res.status(404).json({ message: "Không tìm thấy người dùng" });
    }

    res.status(200).json(user);
  } catch (error) {
    console.error("Get profile error:", error);
    res.status(500).json({ message: "Lỗi server" });
  }
};

// Cập nhật profile
export const updateUserProfile = async (req, res) => {
  try {
    const { name, email } = req.body;

    if (email) {
      const emailExists = await User.findOne({ 
        email, 
        _id: { $ne: req.user.id || req.userId } 
      });
      if (emailExists) {
        return res.status(400).json({ message: "Email này đã được sử dụng bởi tài khoản khác" });
      }
    }

    const updatedUser = await User.findByIdAndUpdate(
      req.user.id || req.userId,
      { name, email },
      { new: true, runValidators: true }
    ).select("-password");

    res.status(200).json({
      message: "Cập nhật thông tin thành công",
      user: updatedUser
    });
  } catch (error) {
    console.error("Update profile error:", error);
    res.status(500).json({ message: "Lỗi server" });
  }
};
// Đổi mật khẩu
export const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: "Vui lòng nhập đầy đủ mật khẩu" });
    }

    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: "Không tìm thấy người dùng" });
    }

    // Kiểm tra mật khẩu hiện tại
    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Mật khẩu hiện tại không đúng" });
    }

    // Hash mật khẩu mới
    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(newPassword, salt);
    await user.save();

    res.status(200).json({ message: "Đổi mật khẩu thành công" });
  } catch (error) {
    console.error("Change password error:", error);
    res.status(500).json({ message: "Lỗi server" });
  }
};