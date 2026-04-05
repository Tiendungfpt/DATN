/**
 * 5 loại phòng công khai — đồng bộ với TP_BE/src/utils/featuredRoomTypes.js
 * và các giá trị `name` / `room_type` trong MongoDB (collection `rooms`).
 */
export const FEATURED_ROOM_SLOTS = [
  { name: "Phòng Tiêu Chuẩn", room_type: "standard" },
  { name: "Phòng Cao cấp-2 giường đơn", room_type: "deluxe_twin" },
  { name: "Phòng Cao cấp-1 giường Queen", room_type: "deluxe_queen" },
  { name: "Phòng Sang Trọng", room_type: "luxury" },
  { name: "Family Suite", room_type: "family_suite" },
];

export const FEATURED_ROOM_TYPE_NAMES = FEATURED_ROOM_SLOTS.map((s) => s.name);

export function normalizeRoomTypeName(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]/g, "")
    .toLowerCase();
}

export function roomMatchesFeaturedSlot(room, slot) {
  if (!room || !slot) return false;
  return (
    normalizeRoomTypeName(room.name) === normalizeRoomTypeName(slot.name) ||
    normalizeRoomTypeName(room.room_type) ===
      normalizeRoomTypeName(slot.room_type)
  );
}

/** Lọc đánh giá: phòng thuộc một trong 5 loại (theo name hoặc room_type). */
export function reviewRoomMatchesFeaturedSection(roomRef) {
  if (!roomRef) return false;
  return FEATURED_ROOM_SLOTS.some((slot) =>
    roomMatchesFeaturedSlot(roomRef, slot),
  );
}
