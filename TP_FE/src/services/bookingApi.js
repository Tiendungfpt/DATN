import axios from "axios";

const API = "http://localhost:3000/api/bookings";

export const createBooking = (data) => {
    return axios.post(API, data);
};

export const getBookings = () => {
    return axios.get(API);
};

export const cancelBooking = (id) => {
    return axios.put(`${API}/cancel/${id}`);
};

export const deleteBooking = (id) => {
    return axios.delete(`${API}/${id}`);
};