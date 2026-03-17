import { Router } from "express";

import { checkAuth } from "../middlewares/checkAuth.js";
import { checkAdmin } from "../middlewares/checkAdmin.js";

import {
  getRevenue,
  getTopRooms
} from "../controllers/adminController.js"; 

import {
  getDashboard,

  getUsers,
  getUserById,
  deleteUser,

  getHotels,
  deleteHotel,

  getRooms,
  deleteRoom,

  getBookings,
  deleteBooking

} from "../controllers/adminController.js";

import {
  getBookingStats,
  searchUsers,
  getUsersPagination
} from "../controllers/adminController.js";

const adminRouter = Router();


// DASHBOARD
adminRouter.get("/dashboard", checkAuth, checkAdmin, getDashboard);


// USERS
adminRouter.get("/users", checkAuth, checkAdmin, getUsers);
adminRouter.get("/users/:id", checkAuth, checkAdmin, getUserById);
adminRouter.delete("/users/:id", checkAuth, checkAdmin, deleteUser);


// HOTELS
adminRouter.get("/hotels", checkAuth, checkAdmin, getHotels);
adminRouter.delete("/hotels/:id", checkAuth, checkAdmin, deleteHotel);


// ROOMS
adminRouter.get("/rooms", checkAuth, checkAdmin, getRooms);
adminRouter.delete("/rooms/:id", checkAuth, checkAdmin, deleteRoom);


// BOOKINGS
adminRouter.get("/bookings", checkAuth, checkAdmin, getBookings);
adminRouter.delete("/bookings/:id", checkAuth, checkAdmin, deleteBooking);


// REVENUE
adminRouter.get("/revenue", checkAuth, checkAdmin, getRevenue);


// TOP ROOMS
adminRouter.get("/top-rooms", checkAuth, checkAdmin, getTopRooms);


// BOOKING STATS
adminRouter.get("/booking-stats", checkAuth, checkAdmin, getBookingStats);


// SEARCH USER
adminRouter.get("/search-users", checkAuth, checkAdmin, searchUsers);


// PAGINATION USER
adminRouter.get("/users-pagination", checkAuth, checkAdmin, getUsersPagination);


export default adminRouter;