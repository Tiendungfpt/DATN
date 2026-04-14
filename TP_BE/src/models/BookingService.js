import mongoose from "mongoose";

/**
 * Line item: extra service attached to a booking (qty and unit price snapshot).
 */
const bookingServiceSchema = new mongoose.Schema(
  {
    booking_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Booking",
      required: true,
      index: true,
    },
    service_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Service",
      required: true,
    },
    quantity: { type: Number, required: true, min: 1, default: 1 },
    unit_price: { type: Number, required: true, min: 0 },
    line_total: { type: Number, required: true, min: 0 },
    note: { type: String, default: "" },
  },
  { timestamps: true, versionKey: false }
);

export default mongoose.model("BookingService", bookingServiceSchema);
