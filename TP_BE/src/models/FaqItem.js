import mongoose from "mongoose";

const faqItemSchema = new mongoose.Schema(
  {
    question: { type: String, required: true, trim: true },
    answer: { type: String, required: true, trim: true },
    order: { type: Number, default: 0 },
    is_active: { type: Boolean, default: true, index: true },
  },
  { timestamps: true, versionKey: false },
);

faqItemSchema.index({ order: 1, _id: 1 });

export default mongoose.model("FaqItem", faqItemSchema);

