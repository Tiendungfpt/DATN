import mongoose from "mongoose";
import Booking from "../models/Booking.js";
import Review from "../models/Review.js";

/**
 * =====================================================
 * USER: CREATE REVIEW
 * POST /api/reviews
 * =====================================================
 * Chỉ user sở hữu booking
 * booking phải completed
 * mỗi booking chỉ review 1 lần
 */
export const createReview = async (req, res) => {
  try {
    const userId = req.userId;
    const { booking_id, rating, comment } = req.body;

    // validate booking id
    if (!booking_id || !mongoose.isValidObjectId(booking_id)) {
      return res.status(400).json({
        message: "booking_id không hợp lệ",
      });
    }

    // validate rating
    const r = Number(rating);
    if (!Number.isInteger(r) || r < 1 || r > 5) {
      return res.status(400).json({
        message: "rating phải từ 1 → 5",
      });
    }

    // tìm booking
    const booking = await Booking.findById(booking_id);

    if (!booking) {
      return res.status(404).json({
        message: "Không tìm thấy booking",
      });
    }

    // check owner
    if (String(booking.user_id) !== String(userId)) {
      return res.status(403).json({
        message: "Bạn không có quyền đánh giá booking này",
      });
    }

    // chỉ completed mới review
    if (booking.status !== "completed") {
      return res.status(400).json({
        message: "Chỉ đánh giá sau khi checkout",
      });
    }

    // đã review chưa
    if (booking.isReviewed) {
      return res.status(409).json({
        message: "Booking này đã được đánh giá",
      });
    }

    // chống review trùng phòng
    const existingRoomReview = await Review.findOne({
      user_id: userId,
      room_id: booking.room_id,
    });

    if (existingRoomReview) {
      return res.status(409).json({
        message: "Bạn đã đánh giá phòng này rồi",
      });
    }

    // tạo review
    const review = await Review.create({
      user_id: userId,
      booking_id: booking._id,
      room_id: booking.room_id,
      rating: r,
      comment: String(comment || "").trim(),
    });

    // đánh dấu booking đã review
    booking.isReviewed = true;
    await booking.save();

    const populated = await Review.findById(review._id)
      .populate("user_id", "name email")
      .populate("room_id", "name room_no")
      .populate(
        "booking_id",
        "check_in_date check_out_date total_price status"
      )
      .lean();

    return res.status(201).json({
      message: "Đánh giá thành công",
      review: populated,
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        message: "Booking này đã có đánh giá",
      });
    }

    return res.status(500).json({
      message: error.message,
    });
  }
};

/**
 * =====================================================
 * ADMIN: GET ALL REVIEWS
 * GET /api/admin/reviews
 * =====================================================
 */
export const getAllReviewsAdmin = async (req, res) => {
  try {
    const { hidden } = req.query;
    // ?hidden=true -> xem review đã ẩn

    const filter = {};

    // nếu truyền query thì filter
    if (hidden !== undefined) {
      filter.isHidden = hidden === "true";
    }

    const reviews = await Review.find(filter)
      .populate("user_id", "name email")
      .populate("room_id", "name room_no")
      .populate(
        "booking_id",
        "check_in_date check_out_date status total_price"
      )
      .sort({ created_at: -1 })
      .lean();

    res.status(200).json({
      total: reviews.length,
      reviews,
    });
  } catch (err) {
    res.status(500).json({
      message: err.message,
    });
  }
};
/**
 * =====================================================
 * PUBLIC: GET REVIEWS (CLIENT)
 * GET /api/reviews
 * =====================================================
 */
export const getAllReviews = async (req, res) => {
  try {
    const reviews = await Review.find({
      isHidden: { $ne: true }, // admin ẩn thì client không thấy
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
    res.status(500).json({
      message: err.message,
    });
  }
};
/**
 * =====================================================
 * ADMIN: TOGGLE HIDE / SHOW REVIEW
 * PATCH /api/admin/reviews/:id/toggle
 * =====================================================
 */
export const toggleReviewVisibility = async (req, res) => {
  try {
    const review = await Review.findById(req.params.id);

    if (!review) {
      return res.status(404).json({
        message: "Không tìm thấy đánh giá",
      });
    }

    review.isHidden = !review.isHidden;
    await review.save();

    res.json({
      message: review.isHidden
        ? "Đã ẩn đánh giá"
        : "Đã hiển thị đánh giá",
      review,
    });
  } catch (err) {
    res.status(500).json({
      message: err.message,
    });
  }
};

/**
 * =====================================================
 * ADMIN: REPLY REVIEW
 * PATCH /api/admin/reviews/:id/reply
 * =====================================================
 */
export const replyReview = async (req, res) => {
  try {
    const { reply } = req.body;

    const review = await Review.findByIdAndUpdate(
      req.params.id,
      {
        adminReply: String(reply || "").trim(),
      },
      { new: true }
    );

    if (!review) {
      return res.status(404).json({
        message: "Review không tồn tại",
      });
    }

    res.json({
      message: "Phản hồi thành công",
      review,
    });
  } catch (err) {
    res.status(500).json({
      message: err.message,
    });
  }
};