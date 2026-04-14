import mongoose from "mongoose";

const roomSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    room_type: { type: String, required: true, trim: true },
    roomType: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "RoomType",
      default: null,
    },
    room_no: { type: String, required: true, trim: true },
    image: { type: String, default: "" },
    price: { type: Number, required: true, min: 0 },
    capacity: { type: Number, required: true, min: 1 },
    status: {
      type: String,
      enum: ["available", "occupied", "maintenance"],
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
