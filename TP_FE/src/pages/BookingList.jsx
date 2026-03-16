import { useEffect, useState } from "react";
import { getBookings, cancelBooking, deleteBooking } from "../services/bookingApi";

function BookingList() {
    const [bookings, setBookings] = useState([]);

    const loadBookings = () => {
        getBookings().then((res) => {
            setBookings(res.data);
        });
    };

    useEffect(() => {
        loadBookings();
    }, []);

    const handleCancel = async (id) => {
        await cancelBooking(id);
        loadBookings();
    };

    const handleDelete = async (id) => {
        await deleteBooking(id);
        loadBookings();
    };

    return (
        <div>
            <h2>Danh sách booking</h2>

            {bookings.map((b) => (
                <div key={b._id} style={{ border: "1px solid #ccc", margin: "10px", padding: "10px" }}>
                    <p>User: {b.userId?.name}</p>
                    <p>Room: {b.roomId?.name}</p>
                    <p>CheckIn: {new Date(b.checkIn).toLocaleDateString()}</p>
                    <p>CheckOut: {new Date(b.checkOut).toLocaleDateString()}</p>
                    <p>Total: {b.totalPrice}</p>
                    <p>Status: {b.status}</p>

                    <button onClick={() => handleCancel(b._id)}>Hủy</button>
                    <button onClick={() => handleDelete(b._id)}>Xóa</button>
                </div>
            ))}
        </div>
    );
}

export default BookingList;