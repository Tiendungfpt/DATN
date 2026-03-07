import jwt from "jsonwebtoken";

export const checkAuth = (req, res, next) => {
  const token = req.headers.authorization?.split(" ")[1];
  console.log(token);
  if (!token) {
    return res.json("Error: Thieu Token");
  }
  jwt.verify(token, "khoa", (err, decoded) => {
    if (err) {
      return res.json("error: token khong hop le");
    }
    console.log("decoded", decoded);
    req.userId = decoded.id;
    next();
  });
};
