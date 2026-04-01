import { Router } from "express";
import { checkAuth } from "../middlewares/checkAuth.js";
import { checkAdmin } from "../middlewares/checkAdmin.js";
import {
  createBooking,
  getMyBookings,
  getAllBookingsAdmin,
  getBookingById,
  updateBooking,
  getAssignableRooms,
  cancelBooking,
  deleteBooking,
  paymentBooking,
} from "../controllers/booking.js";

const bookingRouter = Router();

bookingRouter.post("/", checkAuth, createBooking);
bookingRouter.get("/user", checkAuth, getMyBookings);
bookingRouter.get("/", checkAuth, checkAdmin, getAllBookingsAdmin);

bookingRouter.put("/payment/:id", checkAuth, paymentBooking);
bookingRouter.put("/cancel/:id", checkAuth, cancelBooking);

bookingRouter.get("/:id/assignable-rooms", checkAuth, checkAdmin, getAssignableRooms);
bookingRouter.get("/:id", checkAuth, getBookingById);
bookingRouter.put("/:id", checkAuth, checkAdmin, updateBooking);
bookingRouter.delete("/:id", checkAuth, checkAdmin, deleteBooking);

export default bookingRouter;
