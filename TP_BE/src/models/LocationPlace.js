import mongoose from "mongoose";

const locationPlaceSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    distance_km: { type: String, default: "", trim: true },
    eta_text: { type: String, default: "", trim: true },
    order: { type: Number, default: 0 },
    is_active: { type: Boolean, default: true, index: true },
  },
  { timestamps: true, versionKey: false },
);

locationPlaceSchema.index({ order: 1, _id: 1 });

export default mongoose.model("LocationPlace", locationPlaceSchema);

