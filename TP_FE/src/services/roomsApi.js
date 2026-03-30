import axios from "axios";

const API = "http://localhost:3000/api";

/**
 * Số phòng cùng loại (cùng tên) còn trống trong khoảng ngày — dùng cho trang đặt phòng.
 */
export function getBookingAvailability({ roomId, checkInDate, checkOutDate }) {
  const rid = roomId != null ? String(roomId).trim() : "";
  const params = { roomId: rid };
  if (checkInDate) {
    params.checkInDate = checkInDate;
    params.checkIn = checkInDate;
  }
  if (checkOutDate) {
    params.checkOutDate = checkOutDate;
    params.checkOut = checkOutDate;
  }
  return axios.get(`${API}/rooms/availability/book`, { params });
}
