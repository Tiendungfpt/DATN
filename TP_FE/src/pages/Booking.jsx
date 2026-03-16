import { useState } from "react";
import { createBooking } from "../services/bookingApi";

function Booking() {
    const [form, setForm] = useState({
        userId: "",
        roomId: "",
        checkIn: "",
        checkOut: "",
    });

    const handleChange = (e) => {
        setForm({
            ...form,
            [e.target.name]: e.target.value,
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        try {
            const res = await createBooking(form);
            alert("Đặt phòng thành công");
            console.log(res.data);
        } catch (err) {
            alert("Đặt phòng thất bại");
            console.log(err);
        }
    };

    return (
        <div>
            <h2>Đặt phòng</h2>

            <form onSubmit={handleSubmit}>
                <input
                    type="text"
                    name="userId"
                    placeholder="User ID"
                    onChange={handleChange}
                />

                <input
                    type="text"
                    name="roomId"
                    placeholder="Room ID"
                    onChange={handleChange}
                />

                <input
                    type="date"
                    name="checkIn"
                    onChange={handleChange}
                />

                <input
                    type="date"
                    name="checkOut"
                    onChange={handleChange}
                />

                <button type="submit">Đặt phòng</button>
            </form>
        </div>
    );
}

export default Booking;