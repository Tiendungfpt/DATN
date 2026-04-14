import mongoose from "mongoose";

/**
 * Invoice is created only at check-out (not before).
 */
const invoiceSchema = new mongoose.Schema(
  {
    booking_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Booking",
      required: true,
      unique: true,
    },
    invoice_number: { type: String, required: true, unique: true, trim: true },
    room_subtotal: { type: Number, required: true, min: 0 },
    service_subtotal: { type: Number, required: true, min: 0 },
    grand_total: { type: Number, required: true, min: 0 },
    prepaid_amount: { type: Number, default: 0, min: 0 },
    balance_due: { type: Number, required: true, min: 0 },
    status: {
      type: String,
      enum: ["unpaid", "paid"],
      default: "unpaid",
    },
    paid_at: { type: Date, default: null },
    payment_method: { type: String, default: "cash" },
  },
  { timestamps: true, versionKey: false }
);

export default mongoose.model("Invoice", invoiceSchema);
