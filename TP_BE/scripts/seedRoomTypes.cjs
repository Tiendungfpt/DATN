/**
 * One-off: create RoomType per distinct rooms.room_type and set rooms.roomType.
 * Run: node scripts/seedRoomTypes.cjs  (from TP_BE, MongoDB running)
 */
const mongoose = require("mongoose");
require("dotenv").config();

/** room_type key -> ten hien thi tieng Viet (dong bo FE featuredRoomTypes) */
const TYPE_LABELS = {
  standard: "Ph\u00f2ng Ti\u00eau Chu\u1ea9n",
  deluxe_twin: "Ph\u00f2ng Cao c\u1ea5p-2 gi\u01b0\u1eddng \u0111\u01a1n",
  deluxe_queen: "Ph\u00f2ng Cao c\u1ea5p-1 gi\u01b0\u1eddng Queen",
  luxury: "Ph\u00f2ng Sang Tr\u1ecdng",
  family_suite: "Family Suite",
};

function displayNameForKey(key) {
  if (TYPE_LABELS[key]) return TYPE_LABELS[key];
  return String(key || "")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function looksLikeSlug(name) {
  return /^[a-z][a-z0-9_]*$/i.test(String(name || "").trim());
}

const roomTypeSchema = new mongoose.Schema(
  {
    code: { type: String, default: "" },
    name: String,
    price: Number,
    description: String,
    maxGuests: Number,
    image: { type: String, default: "" },
  },
  { timestamps: true, versionKey: false },
);
const roomSchema = new mongoose.Schema(
  {
    name: String,
    room_type: String,
    roomType: { type: mongoose.Schema.Types.ObjectId, ref: "RoomType" },
    room_no: String,
    image: String,
    price: Number,
    capacity: Number,
    status: String,
  },
  { strict: false },
);

const RoomType = mongoose.models.RoomType || mongoose.model("RoomType", roomTypeSchema);
const Room = mongoose.models.Room || mongoose.model("Room", roomSchema);

async function main() {
  const uri = process.env.MONGODB_URI || "mongodb://localhost:27017/thinhphathotel";
  await mongoose.connect(uri);
  const rooms = await Room.find({}).lean();
  const byType = new Map();
  for (const r of rooms) {
    const key = (r.room_type || "").trim() || r.name;
    if (!byType.has(key)) byType.set(key, []);
    byType.get(key).push(r);
  }
  for (const [key, list] of byType) {
    const sample = list[0];
    const price = Number(sample.price) || 0;
    const label = displayNameForKey(key);
    const sampleImage = String(sample.image || "").trim();

    let rt = await RoomType.findOne({ code: key });
    if (!rt) rt = await RoomType.findOne({ name: key });
    if (!rt) {
      rt = await RoomType.create({
        code: key,
        name: label,
        price,
        description: `Loại phòng: ${label}`,
        maxGuests: sample.capacity || 2,
        image: sampleImage,
      });
      console.log("Created RoomType", key, rt._id);
    } else {
      const updates = {
        code: key,
        price,
        maxGuests: sample.capacity || rt.maxGuests || 2,
      };
      if (looksLikeSlug(rt.name) || rt.name === key) {
        updates.name = label;
      }
      if (sampleImage && (!rt.image || String(rt.image).trim() === "")) {
        updates.image = sampleImage;
      }
      if (!rt.description || String(rt.description).includes("Seeded from room_type")) {
        updates.description = `Loại phòng: ${updates.name || rt.name}`;
      }
      await RoomType.updateOne({ _id: rt._id }, { $set: updates });
      console.log("Updated RoomType", key, rt._id);
    }
    await Room.updateMany({ _id: { $in: list.map((x) => x._id) } }, { roomType: rt._id });
  }
  console.log("Done.");
  await mongoose.disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
