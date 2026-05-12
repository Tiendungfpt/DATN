import mongoose from "mongoose";

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
      enum: ["momo", "vnpay", "cash", "bank"],
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
      enum: ["created", "succeeded", "failed", "refunded", "pending_provider"],
      default: "created",
      index: true,
    },
    provider_order_id: { type: String, default: "", index: true },
    provider_trans_id: { type: String, default: "", index: true },
    provider_message: { type: String, default: "" },
    provider_payload: { type: mongoose.Schema.Types.Mixed, default: null },
  },
  { timestamps: true, versionKey: false },
);

export default mongoose.model("PaymentTransaction", paymentTransactionSchema);

