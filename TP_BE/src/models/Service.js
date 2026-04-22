import mongoose from "mongoose";

/**
 * Catalog of billable extras (food, laundry, damage, etc.).
 */
const serviceSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    defaultPrice: { type: Number, required: true, min: 0 },
    // Relational category for reporting/grouping.
    category_id: { type: mongoose.Schema.Types.ObjectId, ref: "ServiceCategory", default: null, index: true },
    // Unit of measure (chai, lần, người, giờ...)
    unit: { type: String, default: "", trim: true },
    description: { type: String, default: "" },
    isActive: { type: Boolean, default: true, index: true },
  },
  { timestamps: true, versionKey: false }
);

export default mongoose.model("Service", serviceSchema);
