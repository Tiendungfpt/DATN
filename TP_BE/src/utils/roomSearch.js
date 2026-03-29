/**
 * Lọc theo loại phòng (khớp tên phòng trong DB với từ khóa).
 * key khớp query ?roomType=... từ frontend (PUBLIC_ROOM_TYPES).
 */
export const ROOM_TYPE_KEYWORDS = {
  "tieu-chuan": ["tiêu chuẩn", "tieu chuan", "standard", "bình dân", "cơ bản"],
  "cao-cap-2-don": ["cao cấp-2", "2 giường đơn", "hai giường đơn"],
  "cao-cap-queen": ["cao cấp-1", "1 giường queen", "giường queen", "queen"],
  "sang-trong": ["sang trọng", "sang trong", "luxury"],
  "family-suite": ["family suite"],
  /** Tương thích bookmark cũ */
  standard: ["tiêu chuẩn", "standard", "bình dân", "cơ bản"],
  deluxe: ["deluxe", "vip"],
  suite: ["suite", "presidential"],
};

/** Parse chuỗi capacity cũ nếu document chưa có maxGuests. */
export function maxGuestsFromCapacity(capacity) {
  if (capacity == null || capacity === "") return 999;
  const s = String(capacity);
  const nums = s.match(/\d+/g);
  if (!nums || nums.length === 0) return 999;
  const n = nums.map(Number);
  if (s.includes("-") && n.length >= 2) return Math.max(...n);
  return Math.max(...n);
}

/** Ưu tiên trường số maxGuests trên model. */
export function effectiveMaxGuests(room) {
  const m = room?.maxGuests;
  if (m != null && Number(m) > 0) return Number(m);
  return maxGuestsFromCapacity(room?.capacity);
}

export function roomMatchesType(roomName, roomType) {
  if (!roomType || !ROOM_TYPE_KEYWORDS[roomType]) return true;
  const name = String(roomName || "").toLowerCase();
  return ROOM_TYPE_KEYWORDS[roomType].some((k) => name.includes(k));
}
