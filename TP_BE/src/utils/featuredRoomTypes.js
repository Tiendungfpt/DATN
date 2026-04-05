/**
 * 5 loại phòng nổi bật — khớp với `name` / `room_type` trong collection MongoDB `rooms`.
 */
export const FEATURED_ROOM_SLOTS = [
  { name: "Phòng Tiêu Chuẩn", room_type: "standard" },
  { name: "Phòng Cao cấp-2 giường đơn", room_type: "deluxe_twin" },
  { name: "Phòng Cao cấp-1 giường Queen", room_type: "deluxe_queen" },
  { name: "Phòng Sang Trọng", room_type: "luxury" },
  { name: "Family Suite", room_type: "family_suite" },
];

/** @deprecated Dùng FEATURED_ROOM_SLOTS; giữ export cho code cũ. */
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
