import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { Outlet } from "react-router-dom";
import "../components/BookingAdmin.css";

function formatDate(d) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("vi-VN");
}

/** Nhãn trạng thái nghiệp vụ (đồng bộ backend) */
function statusLabelVi(status) {
  switch (status) {
    case "pending":
      return "Chờ xác nhận";
    case "confirmed":
      return "Đã xác nhận";
    case "checked_in":
      return "Đang ở (đã check-in)";
    case "completed":
      return "Đã trả phòng (check-out)";
    case "cancelled":
      return "Đã hủy";
    default:
      return status || "—";
  }
}

export default function BookingAdmin() {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [assignableRoomsByBooking, setAssignableRoomsByBooking] = useState({});
  const [selectedRoomByBooking, setSelectedRoomByBooking] = useState({});
  const [downloadingInvoiceByBooking, setDownloadingInvoiceByBooking] = useState({});

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

  const doCheckIn = async (id) => {
    if (!window.confirm("Xác nhận khách đã nhận phòng (check-in)?")) return;
    try {
      const token = localStorage.getItem("token");
      await axios.put(
        `http://localhost:3000/api/bookings/${id}/check-in`,
        {},
        { headers: { Authorization: `Bearer ${token}` } },
      );
      alert("Check-in thành công — khách đang ở.");
      loadBookings();
    } catch (err) {
      alert(err.response?.data?.message || "Check-in thất bại");
    }
  };

  const doCheckOut = async (id) => {
    if (!window.confirm("Xác nhận khách đã trả phòng (check-out)?")) return;
    try {
      const token = localStorage.getItem("token");
      await axios.put(
        `http://localhost:3000/api/bookings/${id}/check-out`,
        {},
        { headers: { Authorization: `Bearer ${token}` } },
      );
      alert("Check-out thành công — booking hoàn tất, khách có thể đánh giá.");
      loadBookings();
    } catch (err) {
      alert(err.response?.data?.message || "Check-out thất bại");
    }
  };

  const downloadInvoiceAsAdmin = async (bookingId) => {
    const token = localStorage.getItem("token");
    if (!token) {
      alert("Vui lòng đăng nhập admin để xuất hóa đơn.");
      return;
    }
    try {
      setDownloadingInvoiceByBooking((prev) => ({ ...prev, [bookingId]: true }));
      const res = await axios.get(
        `http://localhost:3000/api/bookings/${bookingId}/invoice`,
        {
          headers: { Authorization: `Bearer ${token}` },
          responseType: "blob",
        },
      );
      const blobUrl = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = `hoa-don-${bookingId}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(blobUrl);
      alert("Xuất hóa đơn thành công.");
      loadBookings();
    } catch (err) {
      alert(err.response?.data?.message || "Không thể xuất hóa đơn PDF");
    } finally {
      setDownloadingInvoiceByBooking((prev) => ({ ...prev, [bookingId]: false }));
    }
  };

  /** Bước 1–4: chờ xác nhận → đã xác nhận → đang ở → đã trả phòng */
  function stayFlowStep(status) {
    const steps = [
      { key: "s1", label: "Chờ xác nhận" },
      { key: "s2", label: "Đã xác nhận" },
      { key: "s3", label: "Check-in" },
      { key: "s4", label: "Check-out" },
    ];
    if (status === "cancelled") {
      return (
        <div className="booking-admin-flow booking-admin-flow--cancelled">
          <span>Đơn đã hủy — không áp dụng luồng lưu trú</span>
        </div>
      );
    }
    let currentIdx = -1;
    if (status === "pending") currentIdx = 0;
    else if (status === "confirmed") currentIdx = 1;
    else if (status === "checked_in") currentIdx = 2;
    else if (status === "completed") currentIdx = 3;

    return (
      <div className="booking-admin-flow" aria-label="Luồng check-in check-out">
        {steps.map((s, i) => (
          <div
            key={s.key}
            className={`booking-admin-flow-step ${i <= currentIdx ? "done" : ""} ${i === currentIdx ? "current" : ""}`}
          >
            <span className="booking-admin-flow-dot" />
            <span className="booking-admin-flow-label">{s.label}</span>
            {i < steps.length - 1 ? <span className="booking-admin-flow-line" /> : null}
          </div>
        ))}
      </div>
    );
  }

  const groupedBookings = useMemo(
    () => ({
      pending: bookings.filter((b) => b.status === "pending"),
      confirmed: bookings.filter((b) => b.status === "confirmed"),
      checked_in: bookings.filter((b) => b.status === "checked_in"),
      completed: bookings.filter((b) => b.status === "completed"),
      other: bookings.filter(
        (b) => !["pending", "confirmed", "checked_in", "completed"].includes(b.status),
      ),
    }),
    [bookings],
  );

  const renderBookingCard = (b) => (
    <div key={b._id} className="booking-admin-card">
      {stayFlowStep(b.status)}
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
      <p className="booking-admin-status-row">
        <strong>Trạng thái:</strong>{" "}
        <span className={`booking-admin-status ${b.status}`}>{statusLabelVi(b.status)}</span>
        {b.status === "completed" ? (
          <span
            className={`booking-admin-review-badge ${b.isReviewed ? "reviewed" : "pending-review"}`}
          >
            {b.isReviewed ? "Khách đã đánh giá" : "Chưa đánh giá"}
          </span>
        ) : null}
      </p>
      <div className="booking-admin-actions">
        {(b.status === "pending" || b.status === "confirmed") && (
          <>
            <button className="btn-confirm" type="button" onClick={() => loadAssignableRooms(b._id)}>
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
              type="button"
              className="btn-confirm"
              onClick={() => updateStatus(b._id, "confirmed")}
              disabled={!selectedRoomByBooking[b._id] && !b.assigned_room_id?._id}
            >
              Xác nhận đặt phòng
            </button>
          </>
        )}
        {b.status === "confirmed" && (
          <button type="button" className="btn-checkin" onClick={() => doCheckIn(b._id)}>
            Check-in khách
          </button>
        )}
        {b.status === "checked_in" && (
          <button type="button" className="btn-checkout" onClick={() => doCheckOut(b._id)}>
            Check-out (trả phòng)
          </button>
        )}
        {b.status !== "completed" && (
          <button type="button" className="btn-cancel" onClick={() => updateStatus(b._id, "cancelled")}>
            Hủy booking
          </button>
        )}
        {b.assigned_room_id?._id && ["confirmed", "checked_in", "completed"].includes(b.status) && (
          <button
            type="button"
            className="btn-checkout"
            onClick={() => downloadInvoiceAsAdmin(b._id)}
            disabled={Boolean(downloadingInvoiceByBooking[b._id])}
          >
            {downloadingInvoiceByBooking[b._id] ? "Đang xuất hóa đơn..." : "Xuất hóa đơn PDF"}
          </button>
        )}
        <button type="button" className="btn-remove" onClick={() => removeBooking(b._id)}>
          Xóa
        </button>
      </div>
    </div>
  );

  if (loading) return <p>Đang tải booking...</p>;
  if (error) return <p style={{ color: "crimson" }}>{error}</p>;

  return (
    <div className="booking-admin-page">
      <h2>Quản lý booking</h2>
      <p className="booking-admin-subtitle">
        Theo dõi check-in / check-out, xác nhận phòng và trạng thái đánh giá của khách.
      </p>
      <Outlet
        context={{
          groupedBookings,
          renderBookingCard,
        }}
      />
    </div>
  );
}
