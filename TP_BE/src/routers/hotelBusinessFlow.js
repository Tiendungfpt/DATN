import { Router } from "express";
import { checkAuth } from "../middlewares/checkAuth.js";
import { checkAdmin } from "../middlewares/checkAdmin.js";
import {
  checkInBooking,
  checkOutBooking,
  addBookingServiceLine,
} from "../controllers/booking.js";

/**
 * Required business flow (REST aliases):
 * POST /api/checkin/:bookingId
 * POST /api/checkout/:bookingId
 * POST /api/booking/:id/service
 *
 * Legacy /api/bookings/... routes remain for compatibility.
 */
const hotelBusinessFlowRouter = Router();

function forwardId(paramFrom, handler) {
  return (req, res) => {
    req.params.id = req.params[paramFrom];
    return handler(req, res);
  };
}

hotelBusinessFlowRouter.post(
  "/checkin/:bookingId",
  checkAuth,
  checkAdmin,
  forwardId("bookingId", checkInBooking),
);

hotelBusinessFlowRouter.post(
  "/checkout/:bookingId",
  checkAuth,
  checkAdmin,
  forwardId("bookingId", checkOutBooking),
);

hotelBusinessFlowRouter.post(
  "/booking/:id/service",
  checkAuth,
  checkAdmin,
  addBookingServiceLine,
);

export default hotelBusinessFlowRouter;
