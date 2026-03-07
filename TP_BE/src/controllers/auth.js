import User from "../models/User";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

export const registerUser = async (req, res) => {
  const userExisted = await User.findOne({ email: req.body.email });

  if (userExisted) {
    return res.json("Error: user da ton tai");
  }
  req.body.password = await bcrypt.hash(req.body.password, 10);

  const newUser = await User.create(req.body);
  newUser.password = undefined;
  res.json(newUser);
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
