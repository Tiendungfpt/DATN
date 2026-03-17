import User from "../models/User.js";

export const checkAdmin = async (req, res, next) => {
  try {
    const user = await User.findById(req.userId);

    if (!user) {
      return res.status(404).json({
        message: "User không tồn tại"
      });
    }

    if (user.role !== "admin") {
      return res.status(403).json({
        message: "Bạn không có quyền admin"
      });
    }

    next();
  } catch (error) {
    return res.status(500).json({
      message: error.message
    });
  }
};