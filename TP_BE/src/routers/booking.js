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
  checkInBooking,
  checkOutBooking,
  downloadBookingInvoice,
} from "../controllers/booking.js";

const bookingRouter = Router();

bookingRouter.post("/", checkAuth, createBooking);
bookingRouter.get("/user", checkAuth, getMyBookings);
bookingRouter.get("/", checkAuth, checkAdmin, getAllBookingsAdmin);

bookingRouter.put("/payment/:id", checkAuth, paymentBooking);
bookingRouter.put("/cancel/:id", checkAuth, cancelBooking);

bookingRouter.put("/:id/check-in", checkAuth, checkAdmin, checkInBooking);
bookingRouter.put("/:id/check-out", checkAuth, checkAdmin, checkOutBooking);
bookingRouter.get("/:id/invoice", checkAuth, downloadBookingInvoice);

bookingRouter.get("/:id/assignable-rooms", checkAuth, checkAdmin, getAssignableRooms);
bookingRouter.get("/:id", checkAuth, getBookingById);
bookingRouter.put("/:id", checkAuth, checkAdmin, updateBooking);
bookingRouter.delete("/:id", checkAuth, checkAdmin, deleteBooking);

export default bookingRouter;
