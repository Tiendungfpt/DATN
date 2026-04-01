import { useEffect, useState } from "react";
import axios from "axios";
import "../components/BookingAdmin.css";

function formatDate(d) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("vi-VN");
}

export default function BookingAdmin() {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [assignableRoomsByBooking, setAssignableRoomsByBooking] = useState({});
  const [selectedRoomByBooking, setSelectedRoomByBooking] = useState({});

  const loadBookings = async () => {
    try {
      setLoading(true);
      setError("");
      const token = localStorage.getItem("token");
      const res = await axios.get("http://localhost:3000/api/admin/bookings", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const nextBookings = Array.isArray(res.data) ? res.data : [];
      setBookings(nextBookings);
      setSelectedRoomByBooking((prev) => {
        const draft = { ...prev };
        nextBookings.forEach((b) => {
          if (!draft[b._id] && b?.assigned_room_id?._id) {
            draft[b._id] = b.assigned_room_id._id;
          }
        });
        return draft;
      });
    } catch (err) {
      setError(err.response?.data?.message || "Không tải được danh sách booking");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBookings();
  }, []);

  const loadAssignableRooms = async (bookingId) => {
    try {
      const token = localStorage.getItem("token");
      const res = await axios.get(
        `http://localhost:3000/api/bookings/${bookingId}/assignable-rooms`,
        { headers: { Authorization: `Bearer ${token}` } },
      );
      const rooms = Array.isArray(res.data?.rooms) ? res.data.rooms : [];
      setAssignableRoomsByBooking((prev) => ({ ...prev, [bookingId]: rooms }));
      if (rooms.length > 0) {
        setSelectedRoomByBooking((prev) => ({
          ...prev,
          [bookingId]: prev[bookingId] || rooms[0]._id,
        }));
      }
    } catch (err) {
      alert(err.response?.data?.message || "Không tải được danh sách phòng trống");
    }
  };

  const updateStatus = async (id, status) => {
    try {
      const token = localStorage.getItem("token");
      const payload =
        status === "confirmed"
          ? { status, assigned_room_id: selectedRoomByBooking[id] }
          : { status };
      const res = await axios.put(
        `http://localhost:3000/api/bookings/${id}`,
        payload,
        { headers: { Authorization: `Bearer ${token}` } },
      );
      const roomName =
        res?.data?.booking?.assigned_room_id?.name || res?.data?.booking?.room_id?.name;
      const roomNo = res?.data?.booking?.assigned_room_id?.room_no || "";
      if (status === "confirmed" && roomName) {
        alert(
          `Đã xác nhận booking. Phòng cụ thể đã cấp cho user: ${roomName}${roomNo ? ` (${roomNo})` : ""}`,
        );
      }
      loadBookings();
    } catch (err) {
      alert(err.response?.data?.message || "Không cập nhật được trạng thái");
    }
  };

  const removeBooking = async (id) => {
    if (!window.confirm("Xóa booking này?")) return;
    try {
      const token = localStorage.getItem("token");
      await axios.delete(`http://localhost:3000/api/admin/bookings/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      loadBookings();
    } catch (err) {
      alert(err.response?.data?.message || "Không xóa được booking");
    }
  };

  if (loading) return <p>Đang tải booking...</p>;
  if (error) return <p style={{ color: "crimson" }}>{error}</p>;

  return (
    <div className="booking-admin-page">
      <h2>Quản lý booking</h2>
      <p className="booking-admin-subtitle">
        Xác nhận hoặc hủy booking, theo dõi trạng thái theo thời gian thực.
      </p>
      <div className="booking-admin-grid">
        {bookings.map((b) => (
          <div key={b._id} className="booking-admin-card">
            <p>
              <strong>Khách:</strong> {b.user_id?.name || "—"} ({b.user_id?.email || "—"})
            </p>
            <p>
              <strong>Loại phòng:</strong> {b.room_id?.name || "—"}
            </p>
            <p>
              <strong>Phòng cụ thể:</strong>{" "}
              {b.assigned_room_id?.name
                ? `${b.assigned_room_id.name}${b.assigned_room_id.room_no ? ` (${b.assigned_room_id.room_no})` : ""}`
                : "Chưa xếp"}
            </p>
            <p>
              <strong>Ngày:</strong> {formatDate(b.check_in_date)} - {formatDate(b.check_out_date)}
            </p>
            <p>
              <strong>Tổng tiền:</strong> {(b.total_price || 0).toLocaleString("vi-VN")} đ
            </p>
            <p>
              <strong>Trạng thái:</strong>{" "}
              <span className={`booking-admin-status ${b.status}`}>{b.status}</span>
            </p>
            <div className="booking-admin-actions">
              <button className="btn-confirm" onClick={() => loadAssignableRooms(b._id)}>
                Chọn phòng
              </button>
              {Array.isArray(assignableRoomsByBooking[b._id]) &&
              assignableRoomsByBooking[b._id].length > 0 ? (
                <select
                  value={selectedRoomByBooking[b._id] || ""}
                  onChange={(e) =>
                    setSelectedRoomByBooking((prev) => ({
                      ...prev,
                      [b._id]: e.target.value,
                    }))
                  }
                >
                  {assignableRoomsByBooking[b._id].map((room) => (
                    <option key={room._id} value={room._id}>
                      {(room.name || "Phòng")} {room.room_no ? `(${room.room_no})` : ""}
                    </option>
                  ))}
                </select>
              ) : null}
              <button
                className="btn-confirm"
                onClick={() => updateStatus(b._id, "confirmed")}
                disabled={!selectedRoomByBooking[b._id] && !b.assigned_room_id?._id}
              >
                Xác nhận
              </button>
              <button className="btn-cancel" onClick={() => updateStatus(b._id, "cancelled")}>
                Hủy
              </button>
              <button className="btn-remove" onClick={() => removeBooking(b._id)}>
                Xóa
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
