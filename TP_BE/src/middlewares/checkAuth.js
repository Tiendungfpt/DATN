import jwt from "jsonwebtoken";

export const checkAuth = (req, res, next) => {
  const JWT_SECRET = process.env.JWT_SECRET || "khoa";
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) {
    return res.status(401).json({ message: "Không có token, vui lòng đăng nhập" });
  }

  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (err) {
      return res.status(401).json({ message: "Token không hợp lệ hoặc hết hạn" });
    }

    req.user = decoded;        
    req.userId = decoded.id;   
    next();
  });
};