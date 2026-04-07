import { Router } from "express";
import { checkAuth } from "../middlewares/checkAuth.js";
import { checkAdmin } from "../middlewares/checkAdmin.js";
import Review from "../models/Review.js";
import Room from "../models/rooms.js";

import {
  createReview,
  getAllReviewsAdmin,
  toggleReviewVisibility,
  replyReview,
} from "../controllers/review.js";

const reviewRouter = Router();

function normalizeRoomTypeName(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]/g, "")
    .toLowerCase();
}


// ================= USER =================

// tạo review
reviewRouter.post("/", checkAuth, createReview);


// ✅ LẤY REVIEW THEO ROOM (PUBLIC - CLIENT PAGE)
reviewRouter.get("/room/:roomId", async (req, res) => {
  try {
    const { roomId } = req.params;

    const reviews = await Review.find({
      room_id: roomId,
      isHidden: { $ne: true },
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
    const aggregateByType = String(req.query?.aggregateByType || "") === "1";

    let filter = {
      room_id: roomId,
      isHidden: { $ne: true },
    };

    if (aggregateByType) {
      const targetRoom = await Room.findById(roomId).lean();
      if (!targetRoom) {
        return res.json({ total: 0, avg: "0.0" });
      }

      const targetTypeKey = normalizeRoomTypeName(
        targetRoom.room_type || targetRoom.name,
      );
      const rooms = await Room.find().select("_id room_type name").lean();
      const roomIdsSameType = rooms
        .filter(
          (room) =>
            normalizeRoomTypeName(room.room_type || room.name) === targetTypeKey,
        )
        .map((room) => room._id);

      filter = {
        room_id: { $in: roomIdsSameType },
        isHidden: { $ne: true },
      };
    }

    const reviews = await Review.find(filter);

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