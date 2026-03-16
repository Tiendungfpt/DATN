import {Router} from "express";
import {
createBooking,
getBookings,
getBookingById,
updateBooking,
cancelBooking,
deleteBooking,
paymentBooking
} from "../controllers/booking";

const bookingRouter = Router();

bookingRouter.get("/",getBookings);

bookingRouter.post("/",createBooking);
//Router thanh toán
bookingRouter.put("/payment/:id",paymentBooking);

bookingRouter.put("/:id",updateBooking);

bookingRouter.put("/cancel/:id",cancelBooking);

bookingRouter.get("/:id",getBookingById);

bookingRouter.delete("/:id",deleteBooking);



export default bookingRouter;