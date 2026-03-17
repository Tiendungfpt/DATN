import jwt from "jsonwebtoken";

export const checkAuth = (req, res, next) => {
  const token = req.headers.authorization?.split(" ")[1];

  console.log("TOKEN:", token);

  jwt.verify(token, "khoa", (err, decoded) => {
    console.log("ERR:", err);
    console.log("DECODED:", decoded);

    if (err) {
      return res.json("Error: khong xac thuc duoc");
    }

    req.userId = decoded.id;
    next();
  });
};