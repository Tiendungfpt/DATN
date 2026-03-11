import {Router} from "express";
import {
createBooking,
getBookings,
getBookingById,
updateBooking,
cancelBooking,
deleteBooking
} from "../controllers/booking";

const bookingRouter = Router();

bookingRouter.get("/",getBookings);

bookingRouter.get("/:id",getBookingById);

bookingRouter.post("/",createBooking);

bookingRouter.put("/:id",updateBooking);

bookingRouter.put("/cancel/:id",cancelBooking);

bookingRouter.delete("/:id",deleteBooking);

export default bookingRouter;