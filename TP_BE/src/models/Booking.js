import mongoose from "mongoose";

const bookingSchema = new mongoose.Schema(
  {
    user_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    room_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Room",
      required: true,
    },
    assigned_room_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Room",
      default: null,
    },
    check_in_date: { type: Date, required: true },
    check_out_date: { type: Date, required: true },
    room_quantity: { type: Number, required: true, min: 1, default: 1 },
    services: {
      type: [String],
      default: [],
    },
    service_fee: { type: Number, min: 0, default: 0 },
    total_price: { type: Number, required: true, min: 0 },
    is_paid: {
      type: Boolean,
      default: false,
      index: true,
    },
    status: {
      type: String,
      enum: ["pending", "confirmed", "checked_in", "completed", "cancelled"],
      default: "pending",
    },
    isReviewed: {
      type: Boolean,
      default: false,
    },
    invoice_issued_at: {
      type: Date,
      default: null,
    },
    invoice_issued_by: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

export default mongoose.model("Booking", bookingSchema);
