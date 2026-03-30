import { useParams, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { getBookingById, payBooking } from "../services/bookingApi";
import "./Style/Payment.css";

function formatDate(d) {
  if (!d) return "—";
  try {
    return new Date(d).toLocaleDateString("vi-VN");
  } catch {
    return String(d);
  }
}

function Payment() {
  const { bookingId } = useParams();
  const navigate = useNavigate();

  const [booking, setBooking] = useState(null);
  const [error, setError] = useState("");
  const [paying, setPaying] = useState(false);

  useEffect(() => {
    if (!localStorage.getItem("token")) {
      navigate("/login");
      return;
    }

    getBookingById(bookingId)
      .then((res) => {
        setBooking(res.data);
      })
      .catch((err) => {
        console.error("Lỗi load booking:", err);
        setError(
          err.response?.data?.message || "Không tải được thông tin đặt phòng"
        );
      });
  }, [bookingId, navigate]);

  const handlePay = async () => {
    try {
      setPaying(true);
      await payBooking(bookingId, { paymentMethod: "cash" });
      alert("Thanh toán thành công");
      const res = await getBookingById(bookingId);
      setBooking(res.data);
    } catch (err) {
      alert(err.response?.data?.message || "Thanh toán thất bại");
    } finally {
      setPaying(false);
    }
  };

  if (error) {
    return (
      <div className="payment-page">
        <p className="payment-error">{error}</p>
      </div>
    );
  }

  if (!booking) {
    return (
      <div className="payment-page">
        <h2>Đang tải thanh toán...</h2>
      </div>
    );
  }

  const rooms = booking.roomsDetail || [];
  const roomNames = rooms
    .map((r) => (r && typeof r === "object" && r.name ? r.name : null))
    .filter(Boolean);

  return (
    <div className="payment-page" style={{ maxWidth: "800px", margin: "40px auto" }}>
      <h1>Thanh toán</h1>

      <h2>{roomNames.length ? roomNames.join(", ") : "Đặt phòng"}</h2>

      <p>Ngày nhận: {formatDate(booking.checkInDate)}</p>
      <p>Ngày trả: {formatDate(booking.checkOutDate)}</p>
      <p>Trạng thái: {booking.status}</p>

      <h3>
        Tổng tiền:{" "}
        {(booking.totalPrice ?? 0).toLocaleString("vi-VN")} đ
      </h3>

      {booking.paymentStatus === "paid" ? (
        <p className="payment-done">Đã thanh toán.</p>
      ) : (
        <button
          type="button"
          className="payment-btn"
          disabled={paying}
          onClick={handlePay}
        >
          {paying ? "Đang xử lý..." : "Xác nhận thanh toán"}
        </button>
      )}
    </div>
  );
}

export default Payment;
