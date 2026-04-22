import mongoose from "mongoose";

/**
 * Payment ledger for booking (deposit / balance / refund).
 * This is the source of truth for payment provider interactions.
 */
const paymentTransactionSchema = new mongoose.Schema(
  {
    booking_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Booking",
      required: true,
      index: true,
    },
    provider: {
      type: String,
      enum: ["momo", "cash", "bank"],
      default: "momo",
      index: true,
    },
    type: {
      type: String,
      enum: ["deposit", "balance", "refund"],
      required: true,
      index: true,
    },
    amount: { type: Number, required: true, min: 0 },
    status: {
      type: String,
      enum: ["created", "succeeded", "failed", "refunded"],
      default: "created",
      index: true,
    },
    provider_order_id: { type: String, default: "", index: true },
    provider_trans_id: { type: String, default: "", index: true },
    provider_message: { type: String, default: "" },
    /** Snapshot of provider payloads for audit/debug */
    provider_payload: { type: mongoose.Schema.Types.Mixed, default: null },
  },
  { timestamps: true, versionKey: false },
);

export default mongoose.model("PaymentTransaction", paymentTransactionSchema);

