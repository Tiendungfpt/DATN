import mongoose from "mongoose";

/** Một khách sạn duy nhất — không có hotelId */
const roomSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    image: { type: String, required: true },
    description: { type: String },
    price: { type: Number, required: true, min: 0 },
    maxGuests: { type: Number, required: true, min: 1 },
    capacity: { type: String },
    /** Không dùng "booked" để khóa phòng — chỉ trạng thái vận hành */
    status: {
      type: String,
      enum: ["available", "maintenance"],
      default: "available",
    },
  },
  {
    timestamps: true,
    versionKey: false,
    strictPopulate: false,
  }
);

export default mongoose.model("Room", roomSchema);
