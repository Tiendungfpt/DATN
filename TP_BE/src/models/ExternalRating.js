import mongoose from "mongoose";

const externalRatingSchema = new mongoose.Schema(
  {
    platform: { type: String, required: true, trim: true },
    score: { type: Number, required: true },
    total: { type: Number, default: 0 },
    order: { type: Number, default: 0 },
    is_active: { type: Boolean, default: true, index: true },
  },
  { timestamps: true, versionKey: false },
);

externalRatingSchema.index({ platform: 1 }, { unique: true });
externalRatingSchema.index({ order: 1, _id: 1 });

export default mongoose.model("ExternalRating", externalRatingSchema);

