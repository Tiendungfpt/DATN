import mongoose from "mongoose";

const discountCodeSchema = new mongoose.Schema(
  {
    code: { type: String, required: true, unique: true, trim: true, uppercase: true },
    name: { type: String, default: "", trim: true },
    discount_type: { type: String, enum: ["percent", "fixed"], required: true, default: "percent" },
    discount_value: { type: Number, required: true, min: 0 },
    min_order_value: { type: Number, default: 0, min: 0 },
    max_discount_amount: { type: Number, default: 0, min: 0 },
    usage_limit: { type: Number, default: 0, min: 0 }, // 0 = unlimited
    used_count: { type: Number, default: 0, min: 0 },
    start_at: { type: Date, default: null },
    end_at: { type: Date, default: null },
    is_active: { type: Boolean, default: true },
  },
  { timestamps: true, versionKey: false },
);

export default mongoose.model("DiscountCode", discountCodeSchema);
