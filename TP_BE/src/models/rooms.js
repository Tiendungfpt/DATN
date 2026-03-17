import mongoose from "mongoose";

const roomsSchema = new mongoose.Schema(
{
  name: {
    type: String,
    required: true
  },

  image: {
    type: String,
    required: true
  },

  description: {
    type: String
  },

  price: {
    type: Number,
    required: true
  },

  capacity: {
    type: String,
    required: true
  },

  status: {
    type: String,
    enum: ["available", "booked"],
    default: "available"
  },

  hotelId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Hotel",
    required: true
  }

},
{
  timestamps: true,
  versionKey: false
}
);

const Rooms = mongoose.model("Room", roomsSchema);

export default Rooms;