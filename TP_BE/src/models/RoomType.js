import mongoose from "mongoose";

/**
 * Room category: nightly rate and description.
 * Guests book by roomType + quantity, not a specific physical room.
 */
const roomTypeSchema = new mongoose.Schema(
  {
    /** Mã nội bộ (vd: deluxe_queen), khớp rooms.room_type khi seed */
    code: { type: String, default: "", trim: true },
    /** Tên hiển thị (tiếng Việt) */
    name: { type: String, required: true, trim: true },
    price: { type: Number, required: true, min: 0 },
    hourly_price: { type: Number, default: 0, min: 0 },
    /** Fixed deposit amount per physical room for this category (VND). */
    deposit_amount: { type: Number, default: 0, min: 0 },
    description: { type: String, default: "" },
    maxGuests: { type: Number, default: 2, min: 1 },
    /** Display-only metadata for booking UI */
    area_sqm: { type: Number, default: 0, min: 0 },
    bed_type: { type: String, default: "", trim: true },
    /** Filename in /uploads or full image URL */
    image: { type: String, default: "" },
    /** Optional gallery images (filenames in /uploads or full URLs) */
    images: { type: [String], default: [] },
  },
  { timestamps: true, versionKey: false }
);

export default mongoose.model("RoomType", roomTypeSchema);
