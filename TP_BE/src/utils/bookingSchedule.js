/**
 * Booking có lịch còn "giữ chỗ" — không cho đặt chồng lên.
 * Không gồm: completed, cancelled → sau trả phòng / hủy thì slot được giải phóng.
 */
export const BOOKING_SCHEDULE_BLOCKING_STATUSES = [
  "pending",
  "confirmed",
  "checked_in",
];

/** Phòng vật lý đang bị giữ (đã xác nhận hoặc khách đang ở) — dùng sync trạng thái phòng */
export const ROOM_OCCUPYING_BOOKING_STATUSES = ["confirmed", "checked_in"];
