import { Router } from "express";
import { checkAuth } from "../middlewares/checkAuth.js";
import { checkAdmin } from "../middlewares/checkAdmin.js";
import Review from "../models/Review.js";

import {
  createReview,
  getAllReviewsAdmin,
  toggleReviewVisibility,
  replyReview,
} from "../controllers/review.js";

const reviewRouter = Router();


// ================= USER =================

// tạo review
reviewRouter.post("/", checkAuth, createReview);


// ✅ LẤY REVIEW THEO ROOM (PUBLIC - CLIENT PAGE)
reviewRouter.get("/room/:roomId", async (req, res) => {
  try {
    const { roomId } = req.params;

    const reviews = await Review.find({
      room_id: roomId,
      isHidden: false,
    })
      .populate("user_id", "name")
      .populate({
        path: "room_id",
        select: "name room_no type",
      })
      .populate(
        "booking_id",
        "check_in_date check_out_date"
      )
      .sort({ created_at: -1 });

    res.json(reviews);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Lỗi server" });
  }
});

// ✅ SUMMARY REVIEW (AVG STAR)
reviewRouter.get("/room/:roomId/summary", async (req, res) => {
  try {
    const { roomId } = req.params;

    const reviews = await Review.find({
      room_id: roomId,
      isHidden: false,
    });

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


// ================= ADMIN =================

// lấy tất cả review (admin)
reviewRouter.get("/admin", checkAuth, checkAdmin, getAllReviewsAdmin);

// ẩn / hiện review
reviewRouter.patch(
  "/:id/toggle",
  checkAuth,
  checkAdmin,
  toggleReviewVisibility
);

// phản hồi review
reviewRouter.patch(
  "/:id/reply",
  checkAuth,
  checkAdmin,
  replyReview
);

export default reviewRouter;