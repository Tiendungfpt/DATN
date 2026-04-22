import mongoose from "mongoose";

const bookingSchema = new mongoose.Schema(
  {
    user_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    /** New flow: book by room category (khi có line_items: loại đầu tiên, để tương thích populate) */
    room_type_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "RoomType",
      default: null,
    },
    /** Multiple room types in one booking (pricing / check-in use this when non-empty). */
    line_items: {
      type: [
        {
          room_type_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "RoomType",
            required: true,
          },
          /** Rate plan key for PMS-like pricing (basic/breakfast/non_refund). */
          rate_plan_key: {
            type: String,
            enum: ["basic", "breakfast", "non_refund"],
            default: "basic",
          },
          quantity: { type: Number, required: true, min: 1 },
          unit_price_per_night: { type: Number, default: 0, min: 0 },
          line_subtotal: { type: Number, default: 0, min: 0 },
        },
      ],
      default: [],
    },
    /**
     * @deprecated Legacy field; do not set on new bookings.
     */
    room_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Room",
      default: null,
    },
    /** Legacy single assignment (synced from assigned_room_ids[0]) */
    assigned_room_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Room",
      default: null,
    },
    /** Check-in: concrete rooms, length should equal room_quantity */
    assigned_room_ids: {
      type: [{ type: mongoose.Schema.Types.ObjectId, ref: "Room" }],
      default: [],
    },
    check_in_date: { type: Date, required: true },
    check_out_date: { type: Date, required: true },
    booking_type: {
      type: String,
      enum: ["overnight", "hourly"],
      default: "overnight",
    },
    stay_hours: { type: Number, min: 1, default: null },
    room_quantity: { type: Number, required: true, min: 1, default: 1 },
    /** deposit | full prepay of estimated room portion */
    payment_mode: {
      type: String,
      enum: ["deposit", "full"],
      default: "full",
    },
    /** Amount paid at booking (MoMo / counter) toward the stay */
    prepaid_amount: { type: Number, default: 0, min: 0 },
    /** Snapshot: required deposit to secure the booking (per policy) */
    deposit_amount: { type: Number, default: 0, min: 0 },
    /** Total deposit actually received (online/counter) */
    deposit_paid_amount: { type: Number, default: 0, min: 0 },
    deposit_status: {
      type: String,
      enum: ["unpaid", "paid", "refunded", "partial_refunded", "forfeited"],
      default: "unpaid",
      index: true,
    },
    /** nights * roomType.price * qty at booking time (for payment validation & MoMo) */
    estimated_room_total: { type: Number, default: 0, min: 0 },
    /** Legacy flat extras on booking document */
    services: {
      type: [String],
      default: [],
    },
    service_fee: { type: Number, min: 0, default: 0 },
    /** Grand total after check-out (room + booking services); used by dashboards */
    total_price: { type: Number, required: true, min: 0 },
    is_paid: {
      type: Boolean,
      default: false,
      index: true,
    },
    status: {
      type: String,
      enum: ["pending", "confirmed", "checked_in", "checked_out", "cancelled", "completed"],
      default: "pending",
    },
    cancelled_at: { type: Date, default: null },
    cancel_reason: { type: String, default: "", trim: true },
    no_show_at: { type: Date, default: null },
    isReviewed: {
      type: Boolean,
      default: false,
    },
    guest_name: { type: String, default: "", trim: true },
    guest_phone: { type: String, default: "", trim: true },
    guest_email: { type: String, default: "", trim: true },
    guest_id_number: { type: String, default: "", trim: true },
    /** Snapshot of guest identity/info captured at check-in time (front desk). */
    checkin_guest_snapshot: { type: mongoose.Schema.Types.Mixed, default: null },
    checked_in_by: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    actual_check_in_at: { type: Date, default: null },
    actual_check_out_at: { type: Date, default: null },
    invoice_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Invoice",
      default: null,
    },
    /** Deprecated: invoice only after check-out via Invoice collection */
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

bookingSchema.pre("save", function syncLegacyAssigned(next) {
  const ids = this.assigned_room_ids;
  if (Array.isArray(ids) && ids.length > 0) {
    this.assigned_room_id = ids[0];
  } else if (!ids?.length) {
    this.assigned_room_id = null;
  }
  next();
});

export default mongoose.model("Booking", bookingSchema);
