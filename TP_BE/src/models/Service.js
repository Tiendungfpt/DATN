import mongoose from "mongoose";

/**
 * Catalog of billable extras (food, laundry, damage, etc.).
 */
const serviceSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    defaultPrice: { type: Number, required: true, min: 0 },
    category: {
      type: String,
      enum: ["food", "laundry", "damage", "other"],
      default: "other",
    },
    description: { type: String, default: "" },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true, versionKey: false }
);

export default mongoose.model("Service", serviceSchema);
