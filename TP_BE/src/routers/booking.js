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
  confirmBooking,
  markNoShowBooking,
  deleteBooking,
  paymentBooking,
  checkInBooking,
  checkOutBooking,
  downloadBookingInvoice,
  addBookingServiceLine,
  getBookingServiceLines,
  getCheckOutPreview,
  checkBookingAvailability,
  getBookingFolio,
  getBookingGuests,
  getBookingCharges,
  addBookingCharge,
  replaceBookingGuests,
} from "../controllers/booking.js";

const bookingRouter = Router();

bookingRouter.post("/", checkAuth, createBooking);
bookingRouter.get("/user", checkAuth, getMyBookings);
bookingRouter.get("/", checkAuth, checkAdmin, getAllBookingsAdmin);
bookingRouter.get("/availability", checkBookingAvailability);

bookingRouter.put("/payment/:id", checkAuth, paymentBooking);
// Admin-only per HanoiHotel ops policy
bookingRouter.put("/cancel/:id", checkAuth, checkAdmin, cancelBooking);

bookingRouter.put("/:id/confirm", checkAuth, checkAdmin, confirmBooking);
bookingRouter.put("/:id/cancel", checkAuth, checkAdmin, cancelBooking);
bookingRouter.put("/:id/no-show", checkAuth, checkAdmin, markNoShowBooking);

bookingRouter.put("/:id/check-in", checkAuth, checkAdmin, checkInBooking);
bookingRouter.put("/:id/check-out", checkAuth, checkAdmin, checkOutBooking);
bookingRouter.get("/:id/invoice", checkAuth, downloadBookingInvoice);

bookingRouter.get("/:id/checkout-preview", checkAuth, checkAdmin, getCheckOutPreview);
bookingRouter.get("/:id/folio", checkAuth, getBookingFolio);
bookingRouter.get("/:id/guests", checkAuth, getBookingGuests);
bookingRouter.put("/:id/guests", checkAuth, checkAdmin, replaceBookingGuests);
bookingRouter.get("/:id/charges", checkAuth, getBookingCharges);
bookingRouter.post("/:id/charges", checkAuth, checkAdmin, addBookingCharge);
bookingRouter.get("/:id/services", checkAuth, checkAdmin, getBookingServiceLines);
bookingRouter.post("/:id/services", checkAuth, checkAdmin, addBookingServiceLine);

bookingRouter.get("/:id/assignable-rooms", checkAuth, checkAdmin, getAssignableRooms);
bookingRouter.get("/:id", checkAuth, getBookingById);
bookingRouter.put("/:id", checkAuth, checkAdmin, updateBooking);
bookingRouter.delete("/:id", checkAuth, checkAdmin, deleteBooking);

export default bookingRouter;
