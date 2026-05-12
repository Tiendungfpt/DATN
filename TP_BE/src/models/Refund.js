import mongoose from "mongoose";

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
      enum: ["pending", "processing", "completed", "failed", "success"],
      default: "pending",
      index: true,
    },
    payment_method: { type: String, default: "" },
    refund_transaction_id: { type: String, default: "" },
    provider: { type: String, default: "", trim: true },
    provider_result_code: { type: Number, default: null },
    provider_message: { type: String, default: "", trim: true },
    provider_payload: { type: mongoose.Schema.Types.Mixed, default: null },
    provider_refund_order_id: { type: String, default: "", trim: true },
    provider_refund_request_id: { type: String, default: "", trim: true },
    retry_count: { type: Number, default: 0, min: 0 },
    processed_at: { type: Date, default: null },
    processed_by: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null, index: true },
    failure_message: { type: String, default: "", trim: true },

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

refundSchema.index(
  { booking_id: 1 },
  {
    unique: true,
    partialFilterExpression: { status: { $in: ["pending", "processing"] } },
  },
);

export default mongoose.model("Refund", refundSchema);
