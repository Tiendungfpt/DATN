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

// 2. Route: api/auth/login
export const loginUser = async (req, res) => {
  const user = await User.findOne({ email: req.body.email });
  // check user co trong db ko
  if (!user) {
    return res.status(401).json("Error: khong xac thuc duoc");
  }

  // so sanh password
  const isMatch = await bcrypt.compare(req.body.password, user.password);

  if (!isMatch) {
    return res.status(401).json("Error: khong xac thuc duoc");
  }

  const token = jwt.sign({ id: user._id }, "khoa", { expiresIn: "1h" });
  user.password = undefined;
  res.json({ user, token });
};

export const getProfileUser = (req, res) => {
  console.log(req.userId);

  res.json({ userId: req.userId });
};
