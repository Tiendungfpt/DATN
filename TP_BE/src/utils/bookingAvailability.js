import Booking from "../models/Booking.js";

/**
 * Trùng lịch khi: (newStart < existingEnd) && (newEnd > existingStart)
 * Dùng nửa mở [checkIn, checkOut) tương đương với query Mongo.
 */
export function parseStayDates(checkIn, checkOut) {
  const a = String(checkIn ?? "").trim();
  const b = String(checkOut ?? "").trim();
  if (!a || !b) {
    return { error: "Ngày không hợp lệ" };
  }

  const isoDate = /^\d{4}-\d{2}-\d{2}$/;
  let start;
  let end;
  if (isoDate.test(a) && isoDate.test(b)) {
    const [y1, m1, d1] = a.split("-").map(Number);
    const [y2, m2, d2] = b.split("-").map(Number);
    start = new Date(Date.UTC(y1, m1 - 1, d1, 12, 0, 0));
    end = new Date(Date.UTC(y2, m2 - 1, d2, 12, 0, 0));
  } else {
    start = new Date(a);
    end = new Date(b);
  }

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
