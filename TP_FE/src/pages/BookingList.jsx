import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getMyBookings, cancelBooking } from "../services/bookingApi";
import "./style/BookingList.css";

function formatDate(d) {
  if (!d) return "—";
  try {
    return new Date(d).toLocaleDateString("vi-VN");
  } catch {
    return String(d);
  }
}

function roomLabel(b) {
  const room = b.assigned_room_id || b.room_id;
  if (room && typeof room === "object" && room.name) return room.name;
  return "—";
}

function roomNoLabel(b) {
  const room = b.assigned_room_id;
  const canShowSpecificRoom = b.status === "confirmed" && room;
  if (canShowSpecificRoom && typeof room === "object" && room.room_no) return room.room_no;
  return "";
}

function roomImage(b) {
  const room = b.assigned_room_id || b.room_id;
  if (!room || typeof room !== "object") return "";
  if (!room.image) return "";
  return room.image.startsWith("http")
    ? room.image
    : `http://localhost:3000/uploads/${room.image}`;
}

function statusLabel(status) {
  if (status === "confirmed") return "Đã xác nhận";
  if (status === "pending") return "Chờ xác nhận";
  if (status === "cancelled") return "Đã hủy";
  return status || "—";
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
      <div className="booking-list-header">
        <h2>Đặt phòng của tôi</h2>
        <p>Theo dõi tất cả đơn đặt phòng của bạn tại đây.</p>
      </div>

      <div className="booking-list-stats">
        <div className="booking-stat-item">
          <span>Tổng đơn</span>
          <strong>{bookings.length}</strong>
        </div>
        <div className="booking-stat-item">
          <span>Đã xác nhận</span>
          <strong>{bookings.filter((b) => b.status === "confirmed").length}</strong>
        </div>
        <div className="booking-stat-item">
          <span>Chờ xác nhận</span>
          <strong>{bookings.filter((b) => b.status === "pending").length}</strong>
        </div>
      </div>

      {!bookings.length ? (
        <div className="booking-empty">
          <p>Chưa có đặt phòng nào.</p>
          <Link to="/khach-san" className="booking-primary-link">
            Đi đến danh sách phòng
          </Link>
        </div>
      ) : (
        bookings.map((b) => (
          <div key={b._id} className="booking-list-card">
            <div className="booking-card-top">
              <div className="booking-room-left">
                <img
                  src={
                    roomImage(b) ||
                    "https://images.unsplash.com/photo-1631049307264-da0ec9d70304?q=80&w=1200&auto=format&fit=crop"
                  }
                  alt={roomLabel(b)}
                />
                <div>
                  <p className="booking-room-name">{roomLabel(b)}</p>
                  {roomNoLabel(b) && (
                    <p className="booking-room-id">Số phòng: {roomNoLabel(b)}</p>
                  )}
                  {!(b.status === "confirmed" && b.assigned_room_id) && (
                    <p className="booking-room-id">Đang chờ xếp phòng cụ thể</p>
                  )}
                  <p className="booking-room-id">Mã đơn: {b._id}</p>
                </div>
              </div>
              <span className={`booking-status booking-status-${b.status}`}>
                {statusLabel(b.status)}
              </span>
            </div>

            <div className="booking-card-grid">
              <p>
                <strong>Nhận phòng</strong>
                <span>{formatDate(b.check_in_date)}</span>
              </p>
              <p>
                <strong>Trả phòng</strong>
                <span>{formatDate(b.check_out_date)}</span>
              </p>
              <p>
                <strong>Tổng tiền</strong>
                <span className="booking-total">
                  {(b.total_price ?? 0).toLocaleString("vi-VN")} đ
                </span>
              </p>
            </div>

            {b.status !== "cancelled" && (
              <button
                type="button"
                className="booking-cancel-btn"
                onClick={() => handleCancel(b._id)}
              >
                Hủy đặt phòng
              </button>
            )}
          </div>
        ))
      )}
    </div>
  );
}

export default BookingList;
