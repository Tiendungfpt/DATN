import { Router } from "express";
import upload from "../middlewares/upload.js";

import { checkAuth } from "../middlewares/checkAuth.js";
import { checkAdmin } from "../middlewares/checkAdmin.js";
import { updateUserRole } from "../controllers/adminController.js";
import {
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

adminRouter.get("/dashboard", checkAuth, checkAdmin, getDashboard);

adminRouter.get("/users", checkAuth, checkAdmin, getUsers);
adminRouter.get("/users/:id", checkAuth, checkAdmin, getUserById);
adminRouter.delete("/users/:id", checkAuth, checkAdmin, deleteUser);
adminRouter.patch(
  "/users/:id/role",
  checkAuth,
  checkAdmin,
  updateUserRole
);

adminRouter.get("/rooms", checkAuth, checkAdmin, getRooms);
adminRouter.get("/rooms/:id", checkAuth, checkAdmin, getRoomById);
adminRouter.post("/rooms", checkAuth, checkAdmin, upload.single("image"), createRoom);
adminRouter.put("/rooms/:id", checkAuth, checkAdmin, upload.single("image"), updateRoom);
adminRouter.delete("/rooms/:id", checkAuth, checkAdmin, deleteRoom);

adminRouter.get("/bookings", checkAuth, checkAdmin, getBookings);
adminRouter.delete("/bookings/:id", checkAuth, checkAdmin, deleteBooking);

adminRouter.get("/revenue", checkAuth, checkAdmin, getRevenue);
adminRouter.get("/top-rooms", checkAuth, checkAdmin, getTopRooms);
adminRouter.get("/booking-stats", checkAuth, checkAdmin, getBookingStats);
adminRouter.get("/search-users", checkAuth, checkAdmin, searchUsers);
adminRouter.get("/users-pagination", checkAuth, checkAdmin, getUsersPagination);

export default adminRouter;
