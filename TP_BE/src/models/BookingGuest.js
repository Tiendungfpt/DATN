import mongoose from "mongoose";

/**
 * Guest roster for a booking (VN reporting requirement).
 */
const bookingGuestSchema = new mongoose.Schema(
  {
    booking_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Booking",
      required: true,
      index: true,
    },
    full_name: { type: String, required: true, trim: true },
    id_card: { type: String, default: "", trim: true },
    nationality: { type: String, default: "", trim: true },
    date_of_birth: { type: Date, default: null },
    relationship: { type: String, default: "", trim: true },
    is_primary: { type: Boolean, default: false, index: true },
    captured_at: { type: Date, default: Date.now },
    captured_by: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
  },
  { timestamps: true, versionKey: false }
);

export default mongoose.model("BookingGuest", bookingGuestSchema);

