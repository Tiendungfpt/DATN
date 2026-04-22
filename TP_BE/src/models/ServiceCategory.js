import mongoose from "mongoose";

/**
 * Service categories for reporting/grouping (food, laundry, minibar, etc.)
 */
const serviceCategorySchema = new mongoose.Schema(
  {
    code: { type: String, required: true, trim: true, unique: true },
    name: { type: String, required: true, trim: true },
    isActive: { type: Boolean, default: true, index: true },
  },
  { timestamps: true, versionKey: false }
);

export default mongoose.model("ServiceCategory", serviceCategorySchema);

