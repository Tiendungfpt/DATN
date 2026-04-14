import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { Link, Outlet } from "react-router-dom";
import "../components/BookingAdmin.css";

function formatDate(d) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("vi-VN");
}

function statusLabelVi(status) {
  switch (status) {
    case "pending":
      return "Cho xac nhan";
    case "confirmed":
      return "Đã xác nhận";
    case "checked_in":
      return "Dang o (da check-in)";
    case "checked_out":
    case "completed":
      return "Đã trả phòng (check-out)";
    case "cancelled":
      return "Da huy";
    default:
      return status || "—";
  }
}

export default function BookingAdmin() {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [downloadingInvoiceByBooking, setDownloadingInvoiceByBooking] = useState({});

  const loadBookings = async () => {
    try {
      setLoading(true);
      setError("");
      const token = localStorage.getItem("token");
      const res = await axios.get("http://localhost:3000/api/admin/bookings", {
        headers: { Authorization: `Bearer ${token}` },
      });
      setBookings(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      setError(err.response?.data?.message || "Không tải được danh sách booking");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBookings();
  }, []);

  const updateStatus = async (id, status) => {
    try {
      const token = localStorage.getItem("token");
      await axios.put(
        `http://localhost:3000/api/bookings/${id}`,
        { status },
        { headers: { Authorization: `Bearer ${token}` } },
      );
      if (status === "confirmed") {
        alert("Đã xác nhận booking. Gán phòng khi check-in.");
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

  const downloadInvoiceAsAdmin = async (bookingId) => {
    const token = localStorage.getItem("token");
    if (!token) {
      alert("Vui lòng đăng nhập admin để xuất hóa đơn.");
      return;
    }
    try {
      setDownloadingInvoiceByBooking((prev) => ({ ...prev, [bookingId]: true }));
      const res = await axios.get(`http://localhost:3000/api/bookings/${bookingId}/invoice`, {
        headers: { Authorization: `Bearer ${token}` },
        responseType: "blob",
      });
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

  function stayFlowStep(status) {
    const steps = [
      { key: "s1", label: "Cho xac nhan" },
      { key: "s2", label: "Đã xác nhận" },
      { key: "s3", label: "Check-in" },
      { key: "s4", label: "Check-out" },
    ];
    if (status === "cancelled") {
      return (
        <div className="booking-admin-flow booking-admin-flow--cancelled">
          <span>Cancelled</span>
        </div>
      );
    }
    let currentIdx = -1;
    if (status === "pending") currentIdx = 0;
    else if (status === "confirmed") currentIdx = 1;
    else if (status === "checked_in") currentIdx = 2;
    else if (status === "checked_out" || status === "completed") currentIdx = 3;

    return (
      <div className="booking-admin-flow" aria-label="Stay flow">
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
      completed: bookings.filter(
        (b) => b.status === "checked_out" || b.status === "completed",
      ),
      other: bookings.filter(
        (b) =>
          !["pending", "confirmed", "checked_in", "checked_out", "completed"].includes(
            b.status,
          ),
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
        <strong>Loại phòng:</strong> {b.room_type_id?.name || b.room_id?.name || "—"}
      </p>
      <p>
        <strong>Phong cu the:</strong>{" "}
        {Array.isArray(b.assigned_room_ids) && b.assigned_room_ids.length > 0
          ? b.assigned_room_ids
              .map(
                (r) =>
                  `${r?.name || ""}${r?.room_no ? ` (${r.room_no})` : ""}`.trim(),
              )
              .filter(Boolean)
              .join(", ")
          : b.assigned_room_id?.name
            ? `${b.assigned_room_id.name}${b.assigned_room_id.room_no ? ` (${b.assigned_room_id.room_no})` : ""}`
            : "Chưa xếp (check-in)"}
      </p>
      <p>
        <strong>Ngày:</strong> {formatDate(b.check_in_date)} - {formatDate(b.check_out_date)}
      </p>
      <p>
        <strong>Tong tien:</strong> {(b.total_price || 0).toLocaleString("vi-VN")} đ
      </p>
      <p className="booking-admin-status-row">
        <strong>Trạng thái:</strong>{" "}
        <span className={`booking-admin-status ${b.status}`}>{statusLabelVi(b.status)}</span>
        {b.status === "checked_out" || b.status === "completed" ? (
          <span
            className={`booking-admin-review-badge ${b.isReviewed ? "reviewed" : "pending-review"}`}
          >
            {b.isReviewed ? "Khách đã đánh giá" : "Chưa đánh giá"}
          </span>
        ) : null}
      </p>
      <div className="booking-admin-actions">
        {b.status === "pending" && (
          <button type="button" className="btn-confirm" onClick={() => updateStatus(b._id, "confirmed")}>
            Xác nhận đặt phòng
          </button>
        )}
        {b.status === "confirmed" && (
          <Link className="btn-checkin" to={`/admin/check-in?bookingId=${b._id}`} style={{ display: "inline-block" }}>
            Check-in (CCCD + chọn phòng)
          </Link>
        )}
        {b.status === "checked_in" && (
          <Link
            className="btn-checkout"
            to={`/admin/check-out?bookingId=${b._id}`}
            style={{ display: "inline-block" }}
          >
            Check-out & hóa đơn
          </Link>
        )}
        {b.status === "checked_in" && (
          <Link
            to={`/admin/service-manager?bookingId=${b._id}`}
            style={{ display: "inline-block", marginLeft: 8 }}
          >
            Dịch vụ phát sinh
          </Link>
        )}
        {b.status !== "checked_out" && b.status !== "completed" && (
          <button type="button" className="btn-cancel" onClick={() => updateStatus(b._id, "cancelled")}>
            Huy booking
          </button>
        )}
        {(b.status === "checked_out" || b.status === "completed") &&
          (b.invoice_id?._id || b.invoice_id) && (
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
        Xác nhận không gán phòng; check-in nhập CCCD và chọn phòng; check-out mới tạo hóa đơn.
      </p>
      <p>
        <Link to="/admin/booking-list">Danh sach loc / sap xep</Link>
      </p>
      <Outlet
        context={{
          bookings,
          groupedBookings,
          renderBookingCard,
        }}
      />
    </div>
  );
}
