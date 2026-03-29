import Rooms from "../models/rooms.js";

/** Lấy Map id → phòng (lean). */
export async function mapRoomsById(roomIds) {
  const ids = [
    ...new Set(
      roomIds
        .filter(Boolean)
        .map((id) => String(id))
    ),
  ];
  if (!ids.length) return new Map();
  const rooms = await Rooms.find({ _id: { $in: ids } })
    .select("name price maxGuests image description capacity status")
    .lean();
  return new Map(rooms.map((r) => [String(r._id), r]));
}

/** Gom tất cả roomId từ các booking (mảng rooms). */
export function collectRoomIdsFromBookings(bookings) {
  const out = [];
  for (const b of bookings) {
    for (const rid of b.rooms || []) {
      out.push(rid);
    }
  }
  return out;
}
