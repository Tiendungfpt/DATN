/**
 * Bookings that still hold inventory for a room type (abstract slots) or an assigned room.
 * Excludes: checked_out, cancelled — dates are free for new reservations.
 */
export const BOOKING_SCHEDULE_BLOCKING_STATUSES = [
  "pending",
  "confirmed",
  "checked_in",
];

/** Physical room is occupied only after check-in (with assigned rooms). */
export const ROOM_OCCUPYING_BOOKING_STATUSES = ["checked_in"];
