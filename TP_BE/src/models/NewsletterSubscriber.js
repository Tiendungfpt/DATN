import mongoose from "mongoose";

const newsletterSubscriberSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, trim: true, lowercase: true },
    status: { type: String, default: "subscribed", trim: true },
    source: { type: String, default: "website", trim: true },
  },
  { timestamps: true, versionKey: false },
);

newsletterSubscriberSchema.index({ email: 1 }, { unique: true });

export default mongoose.model("NewsletterSubscriber", newsletterSubscriberSchema);

