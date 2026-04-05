import mongoose from "mongoose";
import Booking from "../models/Booking.js";
import Review from "../models/Review.js";

/**
 * POST /api/reviews
 * Chỉ user sở hữu booking, booking completed, chưa review.
 */
export const createReview = async (req, res) => {
  try {
    const userId = req.userId;
    const { booking_id, rating, comment } = req.body;

    if (!booking_id || !mongoose.isValidObjectId(booking_id)) {
      return res.status(400).json({ message: "booking_id không hợp lệ" });
    }

    const r = Number(rating);
    if (!Number.isInteger(r) || r < 1 || r > 5) {
      return res.status(400).json({ message: "rating phải là số nguyên từ 1 đến 5" });
    }

    const booking = await Booking.findById(booking_id);
    if (!booking) {
      return res.status(404).json({ message: "Không tìm thấy booking" });
    }

    if (String(booking.user_id) !== String(userId)) {
      return res.status(403).json({ message: "Bạn không có quyền đánh giá booking này" });
    }

    if (booking.status !== "completed") {
      return res.status(400).json({
        message: "Chỉ có thể đánh giá sau khi đã trả phòng (status = completed)",
      });
    }

    if (booking.isReviewed) {
      return res.status(409).json({ message: "Booking này đã được đánh giá" });
    }

    const existing = await Review.findOne({ booking_id: booking._id });
    const existingRoomReview = await Review.findOne({
  user_id: userId,
  room_id: booking.room_id,
});

if (existingRoomReview) {
  return res.status(409).json({
    message: "Bạn đã đánh giá phòng này rồi",
  });
}
    if (existing) {
      return res.status(409).json({ message: "Đã tồn tại đánh giá cho booking này" });
    }

    const review = await Review.create({
      user_id: userId,
      booking_id: booking._id,
      room_id: booking.room_id,
      rating: r,
      comment: String(comment || "").trim(),
    });

    booking.isReviewed = true;
    await booking.save();

    const populated = await Review.findById(review._id)
      .populate("user_id", "name email")
      .populate("room_id", "name room_no")
      .populate("booking_id", "check_in_date check_out_date total_price status")
      .lean();

    return res.status(201).json({
      message: "Đánh giá thành công",
      review: populated,
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ message: "Booking này đã có đánh giá" });
    }
    
    return res.status(500).json({ message: error.message });
  }
};
