import mongoose from "mongoose";

/**
 * Ad-hoc charges on a booking folio (minibar, laundry, late checkout, etc).
 */
const bookingChargeSchema = new mongoose.Schema(
  {
    booking_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Booking",
      required: true,
      index: true,
    },
    category: {
      type: String,
      // Keep old values for backward compatibility, add more ops-friendly categories.
      enum: ["food", "laundry", "minibar", "spa", "rental", "surcharge", "other"],
      default: "other",
      index: true,
    },
    service_name: { type: String, required: true, trim: true },
    quantity: { type: Number, required: true, min: 1, default: 1 },
    unit_price: { type: Number, required: true, min: 0, default: 0 },
    total_price: { type: Number, required: true, min: 0, default: 0 },
    charged_at: { type: Date, default: Date.now, index: true },
    charged_by: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    note: { type: String, default: "", trim: true },
  },
  { timestamps: true, versionKey: false }
);

bookingChargeSchema.pre("validate", function computeTotal(next) {
  const qty = Math.max(1, Number(this.quantity) || 1);
  const unit = Math.max(0, Number(this.unit_price) || 0);
  this.total_price = qty * unit;
  next();
});

export default mongoose.model("BookingCharge", bookingChargeSchema);

