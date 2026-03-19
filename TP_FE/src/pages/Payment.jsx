import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";

export default function Payment() {
    const { id } = useParams();
    const navigate = useNavigate();

    const [booking, setBooking] = useState(null);
    const [paymentMethod, setPaymentMethod] = useState("cash");
    const [loading, setLoading] = useState(false);

    // load booking info
    useEffect(() => {
        const fetchBooking = async () => {
            try {
                const res = await axios.get(
                    `http://localhost:5000/api/bookings/${id}`
                );
                setBooking(res.data);
            } catch (err) {
                console.log(err);
            }
        };

        fetchBooking();
    }, [id]);

    // PAYMENT
    const handlePayment = async () => {
        try {
            setLoading(true);

            const res = await axios.put(
                `http://localhost:5000/api/bookings/payment/${id}`,
                {
                    paymentMethod,
                }
            );

            alert(res.data.message);

            navigate("/my-bookings");
        } catch (err) {
            alert(err.response?.data?.message || "Payment failed");
        } finally {
            setLoading(false);
        }
    };

    if (!booking) return <h2>Loading...</h2>;

    return (
        <div className="payment-page">
            <h1>Thanh toán đặt phòng</h1>

            {/* BOOKING INFO */}
            <div className="payment-card">
                <h3>Thông tin đặt phòng</h3>

                <p><b>Khách:</b> {booking.fullName}</p>
                <p><b>Phòng:</b> {booking.room?.name}</p>
                <p><b>Check-in:</b> {booking.checkIn}</p>
                <p><b>Check-out:</b> {booking.checkOut}</p>

                <h2>Tổng tiền: ${booking.totalPrice}</h2>
            </div>

            {/* PAYMENT METHOD */}
            <div className="payment-method">
                <h3>Chọn phương thức thanh toán</h3>

                <label>
                    <input
                        type="radio"
                        value="cash"
                        checked={paymentMethod === "cash"}
                        onChange={(e) => setPaymentMethod(e.target.value)}
                    />
                    Thanh toán khi nhận phòng
                </label>

                <label>
                    <input
                        type="radio"
                        value="banking"
                        checked={paymentMethod === "banking"}
                        onChange={(e) => setPaymentMethod(e.target.value)}
                    />
                    Chuyển khoản ngân hàng
                </label>

                <label>
                    <input
                        type="radio"
                        value="momo"
                        checked={paymentMethod === "momo"}
                        onChange={(e) => setPaymentMethod(e.target.value)}
                    />
                    Ví MoMo
                </label>
            </div>

            {/* BUTTON */}
            <button
                className="pay-btn"
                disabled={loading}
                onClick={handlePayment}
            >
                {loading ? "Đang xử lý..." : "Thanh toán ngay"}
            </button>
        </div>
    );
}