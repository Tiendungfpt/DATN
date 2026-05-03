import mongoose from "mongoose";

const galleryImageSchema = new mongoose.Schema(
  {
    url: { type: String, required: true, trim: true },
    title: { type: String, default: "", trim: true },
    alt: { type: String, default: "", trim: true },
    order: { type: Number, default: 0 },
    is_active: { type: Boolean, default: true, index: true },
    source: { type: String, default: "manual", trim: true },
  },
  { timestamps: true, versionKey: false },
);

galleryImageSchema.index({ order: 1, _id: 1 });

export default mongoose.model("GalleryImage", galleryImageSchema);

