import { useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import axios from "axios";

function Payment() {
    const { bookingId } = useParams();

    const [booking, setBooking] = useState(null);

    useEffect(() => {
        axios
            .get(`http://localhost:3000/api/bookings/${bookingId}`)
            .then((res) => {
                setBooking(res.data);
            })
            .catch((err) => {
                console.error("Lỗi load booking:", err);
            });
    }, [bookingId]);

    if (!booking) return <h2>Đang tải thanh toán...</h2>;

    return (
        <div style={{ maxWidth: "800px", margin: "40px auto" }}>
            <h1>Thanh toán</h1>

            <h2>{booking.roomId?.name}</h2>

            <p>
                Ngày nhận: {booking.checkIn}
            </p>

            <p>
                Ngày trả: {booking.checkOut}
            </p>

            <h3>
                Tổng tiền:{" "}
                {booking.total?.toLocaleString("vi-VN")} đ
            </h3>

            <button
                style={{
                    background: "#28a745",
                    color: "#fff",
                    padding: "10px 20px",
                    border: "none",
                    borderRadius: "5px",
                    cursor: "pointer",
                }}
                onClick={() => alert("Thanh toán thành công 🎉")}
            >
                Xác nhận thanh toán
            </button>
        </div>
    );
}

export default Payment;