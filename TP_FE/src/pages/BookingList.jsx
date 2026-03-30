import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getMyBookings, cancelBooking } from "../services/bookingApi";
import "./Style/BookingList.css";

function formatDate(d) {
  if (!d) return "—";
  try {
    return new Date(d).toLocaleDateString("vi-VN");
  } catch {
    return String(d);
  }
}

function roomLabels(b) {
  const details = b.roomsDetail || [];
  return details
    .map((r) => (r && typeof r === "object" && r.name ? r.name : null))
    .filter(Boolean)
    .join(", ");
}

function BookingList() {
  const [bookings, setBookings] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const loadBookings = () => {
    setLoading(true);
    setError("");
    getMyBookings()
      .then((res) => {
        setBookings(Array.isArray(res.data) ? res.data : []);
      })
      .catch((err) => {
        if (err.response?.status === 401) {
          setError("Vui lòng đăng nhập để xem đặt phòng.");
        } else {
          setError(err.response?.data?.message || err.message || "Lỗi tải dữ liệu");
        }
        setBookings([]);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadBookings();
  }, []);

  const handleCancel = async (id) => {
    if (!window.confirm("Hủy đặt phòng này?")) return;
    try {
      await cancelBooking(id);
      loadBookings();
    } catch (err) {
      alert(err.response?.data?.message || "Không hủy được");
    }
  };

  if (loading) {
    return (
      <div className="booking-list-page">
        <p>Đang tải...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="booking-list-page">
        <p className="booking-list-error">{error}</p>
        <p>
          <Link to="/login">Đăng nhập</Link>
        </p>
      </div>
    );
  }

  return (
    <div className="booking-list-page">
      <h2>Đặt phòng của tôi</h2>

      {!bookings.length ? (
        <p>Chưa có đặt phòng nào.</p>
      ) : (
        bookings.map((b) => (
          <div key={b._id} className="booking-list-card">
            <p>
              <strong>Phòng:</strong> {roomLabels(b) || "—"}
            </p>
            <p>
              <strong>Nhận:</strong> {formatDate(b.checkInDate)}
            </p>
            <p>
              <strong>Trả:</strong> {formatDate(b.checkOutDate)}
            </p>
            <p>
              <strong>Tổng:</strong> {(b.totalPrice ?? 0).toLocaleString("vi-VN")}{" "}
              đ
            </p>
            <p>
              <strong>Trạng thái:</strong> {b.status}
            </p>
            {b.paymentStatus && (
              <p>
                <strong>Thanh toán:</strong> {b.paymentStatus}
              </p>
            )}

            {b.status !== "cancelled" && b.status !== "completed" && (
              <button type="button" onClick={() => handleCancel(b._id)}>
                Hủy đặt phòng
              </button>
            )}
            {b.status === "pending" && (
              <p>
                <Link to={`/payment/${b._id}`}>Thanh toán</Link>
              </p>
            )}
          </div>
        ))
      )}
    </div>
  );
}

export default BookingList;
