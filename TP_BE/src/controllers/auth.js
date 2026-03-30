import User from "../models/User";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

export const registerUser = async (req, res) => {
  try {
    const { name, email, password, phone, role } = req.body;

    // kiểm tra password
    if (!password) {
      return res.status(400).json({
        message: "Password không được để trống",
      });
    }

    const userExisted = await User.findOne({ email });

    if (userExisted) {
      return res.json("Error: user da ton tai");
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = await User.create({
      name,
      email,
      password: hashedPassword,
      phone,
      role,
    });

    newUser.password = undefined;

    res.json(newUser);
  } catch (error) {
    res.status(500).json(error.message);
  }
};
export const updateRole = async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { role: req.body.role },
      { new: true }
    );

    res.json({
      message: "Cập nhật role thành công",
      user
    });

  } catch (error) {
    res.status(500).json({
      message: error.message
    });
  }
};

export const loginUser = async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ message: "Vui lòng nhập email và password" });
        }

        const user = await User.findOne({ email }).select("+password"); // cần lấy password để so sánh

        if (!user) {
            return res.status(401).json({ message: "Email hoặc mật khẩu không đúng" });
        }

        const isMatch = await bcrypt.compare(password, user.password);

        if (!isMatch) {
            return res.status(401).json({ message: "Email hoặc mật khẩu không đúng" });
        }

        // Tạo token
        const token = jwt.sign(
            { id: user._id, role: user.role },
            process.env.JWT_SECRET || "khoa", 
            { expiresIn: "7d" }   // tăng thời gian lên 7 ngày cho tiện
        );

        // Không trả password về client
        user.password = undefined;

        res.json({
            success: true,
            message: "Đăng nhập thành công",
            user,
            token
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Lỗi server" });
    }
};

export const getProfileUser = (req, res) => {
  console.log(req.userId);

  res.json({ userId: req.userId });
};
