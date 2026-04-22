import { api } from "./api";

/** POST /api/bookings — { room_id, check_in_date, check_out_date, room_quantity } — cần JWT */
export const createBooking = (data) => {
  return api.post("/bookings", data);
};

/** GET /api/bookings/user — đặt phòng của tôi */
export const getMyBookings = () => {
  return api.get("/bookings/user");
};

/** GET /api/bookings — admin */
export const getAllBookingsAdmin = () => {
  return api.get("/bookings");
};

/** GET /api/bookings/:id */
export const getBookingById = (id) => {
  return api.get(`/bookings/${id}`);
};

export const cancelBooking = (id) => {
  return api.put(`/bookings/${id}/cancel`);
};

export const deleteBooking = (id) => {
  return api.delete(`/bookings/${id}`);
};

/** PUT /api/bookings/payment/:id */
export const payBooking = (id, body = {}) => {
  return api.put(`/bookings/payment/${id}`, body);
};

export const confirmBooking = (id) => {
  return api.put(`/bookings/${id}/confirm`);
};

export const markNoShowBooking = (id) => {
  return api.put(`/bookings/${id}/no-show`);
};
