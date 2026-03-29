import Booking from "../models/Booking.js";

/**
 * Trùng lịch khi: (newStart < existingEnd) && (newEnd > existingStart)
 * Dùng nửa mở [checkIn, checkOut) tương đương với query Mongo.
 */
export function parseStayDates(checkIn, checkOut) {
  const start = new Date(checkIn);
  const end = new Date(checkOut);
  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    return { error: "Ngày không hợp lệ" };
  }
  if (start >= end) {
    return { error: "Ngày trả phòng phải sau ngày nhận phòng" };
  }
  return { start, end };
}

/**
 * Danh sách roomId đang bận trong khoảng [start, end) (pending/confirmed).
 * @param {import('mongoose').Types.ObjectId[]} roomIds
 */
export async function getBusyRoomIds(roomIds, start, end, excludeBookingId = null) {
  if (!roomIds.length) return new Set();

  const q = {
    status: { $in: ["pending", "confirmed"] },
    rooms: { $in: roomIds },
    checkInDate: { $lt: end },
    checkOutDate: { $gt: start },
  };
  if (excludeBookingId) {
    q._id = { $ne: excludeBookingId };
  }

  const docs = await Booking.find(q).select("rooms").lean();
  const busy = new Set();
  for (const doc of docs) {
    for (const rid of doc.rooms || []) {
      const s = String(rid);
      if (roomIds.some((id) => String(id) === s)) busy.add(s);
    }
  }
  return busy;
}
