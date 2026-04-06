import { Router } from "express";
import upload from "../middlewares/upload.js";

import { checkAuth } from "../middlewares/checkAuth.js";
import { checkAdmin } from "../middlewares/checkAdmin.js";

import Review from "../models/Review.js"; // ⭐ ADD REVIEW MODEL

import {
  updateUserRole,
  getRevenue,
  getTopRooms,
  getDashboard,
  getUsers,
  getUserById,
  deleteUser,
  getRooms,
  getRoomById,
  createRoom,
  updateRoom,
  deleteRoom,
  getBookings,
  deleteBooking,
  getBookingStats,
  searchUsers,
  getUsersPagination,
} from "../controllers/adminController.js";

const adminRouter = Router();

/* =====================================================
   DASHBOARD
===================================================== */
adminRouter.get("/dashboard", checkAuth, checkAdmin, getDashboard);

/* =====================================================
   USERS
===================================================== */
adminRouter.get("/users", checkAuth, checkAdmin, getUsers);
adminRouter.get("/users/:id", checkAuth, checkAdmin, getUserById);
adminRouter.delete("/users/:id", checkAuth, checkAdmin, deleteUser);

adminRouter.patch(
  "/users/:id/role",
  checkAuth,
  checkAdmin,
  updateUserRole
);

adminRouter.get("/search-users", checkAuth, checkAdmin, searchUsers);
adminRouter.get(
  "/users-pagination",
  checkAuth,
  checkAdmin,
  getUsersPagination
);

/* =====================================================
   ROOMS
===================================================== */
adminRouter.get("/rooms", checkAuth, checkAdmin, getRooms);
adminRouter.get("/rooms/:id", checkAuth, checkAdmin, getRoomById);

adminRouter.post(
  "/rooms",
  checkAuth,
  checkAdmin,
  upload.single("image"),
  createRoom
);

adminRouter.put(
  "/rooms/:id",
  checkAuth,
  checkAdmin,
  upload.single("image"),
  updateRoom
);

adminRouter.delete("/rooms/:id", checkAuth, checkAdmin, deleteRoom);

/* =====================================================
   BOOKINGS
===================================================== */
adminRouter.get("/bookings", checkAuth, checkAdmin, getBookings);
adminRouter.delete("/bookings/:id", checkAuth, checkAdmin, deleteBooking);

/* =====================================================
   STATISTICS
===================================================== */
adminRouter.get("/revenue", checkAuth, checkAdmin, getRevenue);
adminRouter.get("/top-rooms", checkAuth, checkAdmin, getTopRooms);
adminRouter.get("/booking-stats", checkAuth, checkAdmin, getBookingStats);

/* =====================================================
   ⭐⭐⭐ ADMIN REVIEW MANAGEMENT ⭐⭐⭐
===================================================== */

/**
 * GET ALL REVIEWS
 * /api/admin/reviews
 */
adminRouter.get(
  "/reviews",
  checkAuth,
  checkAdmin,
  async (req, res) => {
    try {
      const reviews = await Review.find()
        .populate("user_id", "name")
        .populate("room_id", "name room_no")
        .sort({ created_at: -1 });

      res.json(reviews);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Lỗi server" });
    }
  }
);

/**
 * TOGGLE HIDE REVIEW
 * /api/admin/reviews/:id/toggle
 */
adminRouter.patch(
  "/reviews/:id/toggle",
  checkAuth,
  checkAdmin,
  async (req, res) => {
    try {
      const review = await Review.findById(req.params.id);

      if (!review) {
        return res.status(404).json({
          message: "Không tìm thấy review",
        });
      }

      review.isHidden = !review.isHidden;
      await review.save();

      res.json({
        message: "Cập nhật trạng thái thành công",
        review,
      });
    } catch (error) {
      res.status(500).json({ message: "Lỗi server" });
    }
  }
);

/**
 * ADMIN REPLY REVIEW
 * /api/admin/reviews/:id/reply
 */
adminRouter.patch(
  "/reviews/:id/reply",
  checkAuth,
  checkAdmin,
  async (req, res) => {
    try {
      const { reply } = req.body;

      const review = await Review.findByIdAndUpdate(
        req.params.id,
        { adminReply: reply },
        { new: true }
      );

      res.json({
        message: "Đã phản hồi review",
        review,
      });
    } catch (error) {
      res.status(500).json({ message: "Lỗi server" });
    }
  }
);

/**
 * DELETE REVIEW
 * /api/admin/reviews/:id
 */
adminRouter.delete(
  "/reviews/:id",
  checkAuth,
  checkAdmin,
  async (req, res) => {
    try {
      await Review.findByIdAndDelete(req.params.id);

      res.json({
        message: "Đã xoá review",
      });
    } catch (error) {
      res.status(500).json({ message: "Lỗi server" });
    }
  }
);

export default adminRouter;