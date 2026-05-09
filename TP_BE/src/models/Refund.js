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
    },
    user_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    amount: { type: Number, required: true, min: 0 },
    original_amount: { type: Number, required: true, min: 0 },
    cancellation_fee: { type: Number, required: true, min: 0 },
    reason: { type: String, required: true, trim: true },
    status: {
      type: String,
      // Manual approval flow:
      // - pending: user submitted request, waiting admin review
      // - success: admin marked as refunded manually
      // - failed: admin rejected (or internal validation failure)
      enum: ["pending", "success", "failed"],
      default: "pending",
      index: true,
    },
    payment_method: { type: String, default: "" },
    refund_transaction_id: { type: String, default: "" },
    processed_at: { type: Date, default: null },
    processed_by: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null, index: true },
    failure_message: { type: String, default: "", trim: true },

    // User-provided payout info for manual refund approval (admin will do it outside system)
    payout_method: {
      type: String,
      enum: ["momo", "bank", "cash", "other", ""],
      default: "",
      trim: true,
    },
    payout_phone: { type: String, default: "", trim: true }, // MoMo phone
    payout_bank_name: { type: String, default: "", trim: true },
    payout_bank_account_name: { type: String, default: "", trim: true },
    payout_bank_account_number: { type: String, default: "", trim: true },
    admin_note: { type: String, default: "", trim: true },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

/**
 * Prevent duplicate active refunds for same booking.
 * Only one document may exist in (pending|processing) per booking.
 */
refundSchema.index(
  { booking_id: 1 },
  {
    unique: true,
    partialFilterExpression: { status: { $in: ["pending"] } },
  },
);

export default mongoose.model("Refund", refundSchema);
