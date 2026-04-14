import mongoose from "mongoose";
import Rooms from "../models/rooms.js";
import Booking from "../models/Booking.js";
import RoomType from "../models/RoomType.js";
import { BOOKING_SCHEDULE_BLOCKING_STATUSES } from "./bookingSchedule.js";

export function nightsBetween(start, end) {
  const ms = end.getTime() - start.getTime();
  return Math.max(1, Math.ceil(ms / (1000 * 60 * 60 * 24)));
}

export function computeRoomSubtotal(pricePerNight, nights, quantity) {
  return Math.max(0, Number(pricePerNight) || 0) * nights * Math.max(1, quantity);
}

/** Physical rooms linked to a RoomType (excludes maintenance). Legacy rooms without roomType ref are not counted. */
export async function countBookablePhysicalRoomsByType(roomTypeId) {
  if (!mongoose.isValidObjectId(roomTypeId)) return 0;
  return Rooms.countDocuments({
    roomType: roomTypeId,
    status: { $nin: ["maintenance"] },
  });
}

/**
 * Sum reserved "slots" for a room type in [start, end): abstract qty for pending/confirmed,
 * or assigned room count when checked_in.
 */
export async function sumReservedSlotsForRoomType(roomTypeId, start, end, excludeBookingId) {
  if (!mongoose.isValidObjectId(roomTypeId)) return 0;
  const filter = {
    status: { $in: BOOKING_SCHEDULE_BLOCKING_STATUSES },
    check_in_date: { $lt: end },
    check_out_date: { $gt: start },
  };
  if (excludeBookingId && mongoose.isValidObjectId(excludeBookingId)) {
    filter._id = { $ne: excludeBookingId };
  }
  const list = await Booking.find(filter)
    .select("status room_quantity assigned_room_ids line_items room_type_id")
    .lean();

  const checkedIn = list.filter(
    (b) => b.status === "checked_in" && Array.isArray(b.assigned_room_ids) && b.assigned_room_ids.length > 0,
  );
  const allAssignedIds = [...new Set(checkedIn.flatMap((b) => (b.assigned_room_ids || []).map(String)))];
  let idToType = new Map();
  if (allAssignedIds.length > 0) {
    const roomDocs = await Rooms.find({ _id: { $in: allAssignedIds } }).select("roomType").lean();
    idToType = new Map(roomDocs.map((r) => [String(r._id), String(r.roomType || "")]));
  }

  let sum = 0;
  const tid = String(roomTypeId);
  for (const b of list) {
    if (b.status === "checked_in" && Array.isArray(b.assigned_room_ids) && b.assigned_room_ids.length > 0) {
      for (const rid of b.assigned_room_ids) {
        if (idToType.get(String(rid)) === tid) sum += 1;
      }
    } else if (Array.isArray(b.line_items) && b.line_items.length > 0) {
      for (const li of b.line_items) {
        if (String(li.room_type_id) === tid) {
          sum += Math.max(1, Number(li.quantity) || 1);
        }
      }
    } else if (b.room_type_id && String(b.room_type_id) === tid) {
      sum += Math.max(1, Number(b.room_quantity) || 1);
    }
  }
  return sum;
}

/** Room document is "physically blocked" by another stay (checked_in with assignment, or legacy confirmed+assigned). */
export function isRoomStatusBlockedForAssign(room) {
  const st = room?.status;
  return st === "occupied";
}

/**
 * IDs of rooms that are assigned on overlapping bookings (checked_in, or legacy flows).
 */
export async function getPhysicallyBusyRoomIds(start, end, excludeBookingId) {
  const filter = {
    status: "checked_in",
    check_in_date: { $lt: end },
    check_out_date: { $gt: start },
    $or: [{ assigned_room_id: { $ne: null } }, { assigned_room_ids: { $exists: true, $ne: [] } }],
  };
  if (excludeBookingId && mongoose.isValidObjectId(excludeBookingId)) {
    filter._id = { $ne: excludeBookingId };
  }
  const rows = await Booking.find(filter).select("assigned_room_id assigned_room_ids status").lean();
  const ids = new Set();
  for (const b of rows) {
    for (const id of b.assigned_room_ids || []) {
      if (id) ids.add(String(id));
    }
    if (b.assigned_room_id) ids.add(String(b.assigned_room_id));
  }
  return ids;
}

export async function loadRoomTypeForBooking(booking) {
  if (booking.room_type_id) {
    const rt =
      booking.room_type_id?.name != null
        ? booking.room_type_id
        : await RoomType.findById(booking.room_type_id).lean();
    return rt;
  }
  if (booking.room_id) {
    const room =
      booking.room_id?.room_no != null
        ? booking.room_id
        : await Rooms.findById(booking.room_id).populate("roomType").lean();
    if (room?.roomType && typeof room.roomType === "object") {
      return room.roomType;
    }
    const price = Number(room?.price) || 0;
    return { name: room?.name || room?.room_type, price, _id: null };
  }
  return null;
}
