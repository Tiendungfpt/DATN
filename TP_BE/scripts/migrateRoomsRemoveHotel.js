/**
 * Chạy một lần sau khi đổi model Room (bỏ hotelId, thêm maxGuests):
 *   node scripts/migrateRoomsRemoveHotel.js
 *
 * Gán maxGuests từ capacity cũ (hoặc mặc định 4), xóa hotelId.
 */
const mongoose = require("mongoose");

const MONGO_URI =
  process.env.MONGO_URI || "mongodb://localhost:27017/thinhphathotel";

function maxFromCapacity(capacity) {
  if (capacity == null || capacity === "") return 4;
  const nums = String(capacity).match(/\d+/g);
  if (!nums || !nums.length) return 4;
  return Math.max(...nums.map(Number));
}

async function main() {
  await mongoose.connect(MONGO_URI);
  const col = mongoose.connection.collection("rooms");
  const docs = await col.find({}).toArray();
  let n = 0;
  for (const doc of docs) {
    const maxGuests =
      typeof doc.maxGuests === "number" && doc.maxGuests >= 1
        ? doc.maxGuests
        : maxFromCapacity(doc.capacity);
    await col.updateOne(
      { _id: doc._id },
      { $set: { maxGuests }, $unset: { hotelId: "" } }
    );
    n += 1;
  }
  console.log(`Đã cập nhật ${n} phòng.`);
  await mongoose.disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
