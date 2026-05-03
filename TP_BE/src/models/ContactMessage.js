import mongoose from "mongoose";

const contactMessageSchema = new mongoose.Schema(
  {
    user_id: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null, index: true },
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, trim: true, lowercase: true, index: true },
    phone: { type: String, default: "", trim: true },
    subject: { type: String, required: true, trim: true },
    message: { type: String, required: true, trim: true },
    status: {
      type: String,
      enum: ["new", "replied", "closed"],
      default: "new",
      index: true,
    },
    admin_reply: { type: String, default: "", trim: true },
    replied_by: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    replied_at: { type: Date, default: null },
    user_read_reply_at: { type: Date, default: null },
  },
  { timestamps: true, versionKey: false },
);

export default mongoose.model("ContactMessage", contactMessageSchema);
