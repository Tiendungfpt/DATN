import mongoose from "mongoose";

const amenitySchema = new mongoose.Schema(
  {
    key: { type: String, default: "", trim: true, index: true },
    icon: { type: String, default: "", trim: true },
    title: { type: String, required: true, trim: true },
    description: { type: String, default: "", trim: true },
    order: { type: Number, default: 0 },
    is_active: { type: Boolean, default: true, index: true },
  },
  { timestamps: true, versionKey: false },
);

amenitySchema.index({ order: 1, _id: 1 });

export default mongoose.model("Amenity", amenitySchema);

