import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "khoa";

export const checkAuth = (req, res, next) => {
  const token = req.headers.authorization?.split(" ")[1];

  if (!token) {
    return res.status(401).json({ message: "Không có token" });
  }

  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (err) {
      return res.status(401).json({ message: "Token không hợp lệ" });
    }

    req.userId = decoded.id;
    next();
  });
};
