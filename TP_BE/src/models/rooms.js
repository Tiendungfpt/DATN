import mongoose from "mongoose";

const roomSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    image: { type: String, required: true },
    description: { type: String },
    price: { type: Number, required: true, min: 0 },
    maxGuests: { type: Number, required: true, min: 1 },
    capacity: { type: String },
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
