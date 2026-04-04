import { Router } from "express";
import { checkAuth } from "../middlewares/checkAuth.js";
import { createReview } from "../controllers/review.js";
import Review from "../models/Review.js";

const reviewRouter = Router();

// ✅ Tạo review
reviewRouter.post("/", checkAuth, createReview);
// ✅ Lấy tất cả review (CHO TRANG HOME / HOTEL LIST)
reviewRouter.get("/", async (req, res) => {
  try {
    const reviews = await Review.find()
      .populate("user_id", "name")
      .populate("room_id", "name room_no") // ✅ QUAN TRỌNG
      .sort({ created_at: -1 });

    res.json(reviews);
  } catch (err) {
    res.status(500).json({ message: "Lỗi server" });
  }
});

// ✅ Lấy số sao trung bình (để TRÊN)
reviewRouter.get("/room/:roomId/summary", async (req, res) => {
  try {
    const { roomId } = req.params;

    const reviews = await Review.find({ room_id: roomId });

    const total = reviews.length;

    const avg =
      total > 0
        ? reviews.reduce((sum, r) => sum + r.rating, 0) / total
        : 0;

    res.json({
      total,
      avg: avg.toFixed(1),
    });
  } catch (err) {
    res.status(500).json({ message: "Lỗi server" });
  }
});

// ✅ Lấy review theo room (để SAU)
reviewRouter.get("/room/:roomId", async (req, res) => {
  try {
    const { roomId } = req.params;

    const reviews = await Review.find({ room_id: roomId })
      .populate("user_id", "name")
      .populate("room_id", "name room_no") 
       .sort({ createdAt: -1 });

    res.json(reviews);
  } catch (err) {
    res.status(500).json({ message: "Lỗi server" });
  }
});


export default reviewRouter;