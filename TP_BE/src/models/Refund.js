import mongoose from "mongoose";

/**
 * Yêu cầu hoàn tiền theo booking (policy mới trong utils/refundPolicy.js).
 */
const refundSchema = new mongoose.Schema(
  {
    booking_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Booking",
      required: true,
      index: true,
    },
    user_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    amount: { type: Number, required: true, min: 0 },
    original_amount: { type: Number, required: true, min: 0 },
    cancellation_fee: { type: Number, required: true, min: 0 },
    reason: { type: String, required: true, trim: true },
    status: {
      type: String,
      enum: ["pending", "processing", "success", "failed"],
      default: "pending",
      index: true,
    },
    payment_method: { type: String, default: "" },
    refund_transaction_id: { type: String, default: "" },
    processed_at: { type: Date, default: null },
    failure_message: { type: String, default: "", trim: true },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

refundSchema.index({ booking_id: 1, status: 1 });

export default mongoose.model("Refund", refundSchema);
