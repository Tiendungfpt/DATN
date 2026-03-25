import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import { createBooking } from "../services/bookingApi";
import "./Style/Booking.css";

function Booking() {
    const { roomId } = useParams();
    const navigate = useNavigate();

    const [room, setRoom] = useState(null);
    const [nights, setNights] = useState(0);
    const [total, setTotal] = useState(0);
    const [loading, setLoading] = useState(false);

    const user = JSON.parse(localStorage.getItem("user"));

    const [form, setForm] = useState({
        userId: user?._id,
        roomId: roomId,
        checkIn: "",
        checkOut: "",
    });

    // =====================
    // LOAD ROOM INFO
    // =====================
    useEffect(() => {
        axios
            .get(`http://localhost:3000/api/rooms/${roomId}`)
            .then((res) => setRoom(res.data))
            .catch(console.log);
    }, [roomId]);

    // =====================
    // CALCULATE NIGHTS + TOTAL
    // =====================
    useEffect(() => {
        if (form.checkIn && form.checkOut && room) {
            const inDate = new Date(form.checkIn);
            const outDate = new Date(form.checkOut);

            const diff =
                (outDate - inDate) / (1000 * 60 * 60 * 24);

            if (diff > 0) {
                setNights(diff);
                setTotal(diff * room.price);
            } else {
                setNights(0);
                setTotal(0);
            }
        }
    }, [form.checkIn, form.checkOut, room]);

    // =====================
    // HANDLE CHANGE + VALIDATE DATE
    // =====================
    const handleChange = (e) => {
        const { name, value } = e.target;

        const newForm = {
            ...form,
            [name]: value,
        };

        if (newForm.checkIn && newForm.checkOut) {
            const inDate = new Date(newForm.checkIn);
            const outDate = new Date(newForm.checkOut);

            const today = new Date();
            today.setHours(0, 0, 0, 0);

            if (inDate < today) {
                alert("Không thể chọn ngày trong quá khứ");
                return;
            }

            if (outDate <= inDate) {
                alert("Ngày trả phòng phải sau ngày nhận phòng");
                return;
            }
        }

        setForm(newForm);
    };

    // =====================
    // SUBMIT BOOKING → GO PAYMENT
    // =====================
    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!total) {
            alert("Vui lòng chọn ngày hợp lệ");
            return;
        }

        try {
            setLoading(true);

            const res = await createBooking(form);

            alert("✅ Đặt phòng thành công");

            const bookingId = res.data.booking._id;

            // chuyển sang trang thanh toán
            navigate(`/payment/${bookingId}`);

        } catch (err) {
            alert(err.response?.data?.message || "Đặt phòng thất bại");
        } finally {
            setLoading(false);
        }
    };

    if (!room) return <h2>Đang tải...</h2>;

    const today = new Date().toISOString().split("T")[0];

    return (
        <div className="booking-wrapper">

            {/* LEFT */}
            <div className="booking-left">
                <img
                    src={
                        room.image?.startsWith("http")
                            ? room.image
                            : `http://localhost:3000/uploads/${room.image}`
                    }
                    alt={room.name}
                />

                <h2>{room.name}</h2>
                <p>{room.description}</p>

                <h3 className="price">
                    {room.price.toLocaleString("vi-VN")} đ / đêm
                </h3>
            </div>

            {/* RIGHT */}
            <form className="booking-right" onSubmit={handleSubmit}>
                <h2>Thông tin đặt phòng</h2>

                <label>Nhận phòng</label>
                <input
                    type="date"
                    name="checkIn"
                    min={today}
                    required
                    value={form.checkIn}
                    onChange={handleChange}
                />

                <label>Trả phòng</label>
                <input
                    type="date"
                    name="checkOut"
                    min={form.checkIn || today}
                    required
                    value={form.checkOut}
                    onChange={handleChange}
                />

                <div className="summary">
                    <p>Số đêm: <b>{nights}</b></p>
                    <p>
                        Giá / đêm:{" "}
                        {room.price.toLocaleString("vi-VN")} đ
                    </p>

                    <h3>
                        Tổng tiền:
                        <span>
                            {total.toLocaleString("vi-VN")} đ
                        </span>
                    </h3>
                </div>

                <button type="submit" disabled={!total || loading}>
                    {loading ? "Đang xử lý..." : "Thanh toán ngay"}
                </button>
            </form>
        </div>
    );
}

export default Booking;