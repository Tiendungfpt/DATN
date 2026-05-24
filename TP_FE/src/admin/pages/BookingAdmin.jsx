import { useEffect, useState } from "react";
import axios from "axios";
import { Link, Outlet, useLocation } from "react-router-dom";
import "../components/BookingAdmin.css";

function formatDate(d) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("vi-VN");
}

function statusLabelVi(status) {
  switch (status) {
    case "pending":
      return "Chờ xác nhận";
    case "confirmed":
      return "Đã xác nhận";
    case "checked_in":
      return "Đang ở (đã check-in)";
    case "checked_out":
    case "completed":
      return "Đã trả phòng (check-out)";
    case "cancelled":
      return "Đã hủy";
    case "pending_refund":
      return "Chờ hoàn tiền";
    default:
      return status || "—";
  }
}

function depositStatusLabelVi(status) {
  const s = String(status || "unpaid").toLowerCase();
  if (s === "paid") return "Đã cọc";
  if (s === "partial" || s === "partially_paid") return "Cọc một phần";
  return "Chưa cọc";
}

/** Map URL nhánh booking → query `status` backend (null = tất cả). */
function adminBookingsStatusFromPath(pathname) {
  const p = String(pathname || "");
  if (p.includes("/bookings/pending")) return "pending";
  if (p.includes("/bookings/confirmed")) return "confirmed";
  if (p.includes("/bookings/checked-in")) return "checked_in";
  if (p.includes("/bookings/completed")) return "checked_out";
  if (p.includes("/bookings/cancelled")) return "cancelled";
  return null;
}

function normalizeRatePlanKey(value) {
  const k = String(value || "").trim().toLowerCase();
  if (k === "breakfast") return "breakfast";
  if (k === "non_refund" || k === "nonrefund" || k === "non-refundable") return "non_refund";
  return "basic";
}

function computeHoursUntilArrival(checkInDate) {
  const start = new Date(checkInDate);
  if (Number.isNaN(start.getTime())) return null;
  return (start.getTime() - Date.now()) / (1000 * 60 * 60);
}

function computeCancellationRefundRate(hoursUntilArrival) {
  if (hoursUntilArrival == null) return 0;
  const days = hoursUntilArrival / 24;
  if (days >= 15) return 1;
  if (hoursUntilArrival > 48) return 0.5;
  return 0;
}

function estimateRefundForBooking(booking) {
  const paidDeposit = Math.max(0, Number(booking?.deposit_paid_amount) || 0);
  const hoursUntilArrival = computeHoursUntilArrival(booking?.check_in_date);
  const firstLine = Array.isArray(booking?.line_items) && booking.line_items.length > 0
    ? booking.line_items[0]
    : null;
  const ratePlanKey = normalizeRatePlanKey(firstLine?.rate_plan_key);
  if (ratePlanKey === "non_refund") return 0;
  const rate = computeCancellationRefundRate(hoursUntilArrival);
  return Math.round(paidDeposit * rate);
}

export default function BookingAdmin() {
  const location = useLocation();
  const [bookings, setBookings] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [searchInput, setSearchInput] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [downloadingInvoiceByBooking, setDownloadingInvoiceByBooking] = useState({});

  const statusParam = adminBookingsStatusFromPath(location.pathname);

  useEffect(() => {
    setPage(1);
    setSearchInput("");
    setDebouncedSearch("");
  }, [location.pathname]);

  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedSearch(searchInput.trim());
      setPage(1);
    }, 400);
    return () => clearTimeout(t);
  }, [searchInput]);

  const loadBookings = async () => {
    try {
      setLoading(true);
      setError("");
      const token = localStorage.getItem("token");
      const params = { page, pageSize, sort: "createdAt_desc" };
      if (statusParam) params.status = statusParam;
      if (debouncedSearch) params.search = debouncedSearch;
      const res = await axios.get("/api/bookings", {
        headers: { Authorization: `Bearer ${token}` },
        params,
      });
      const data = res.data;
      if (Array.isArray(data)) {
        setBookings(data);
        setTotal(data.length);
        setTotalPages(1);
      } else {
        setBookings(Array.isArray(data.items) ? data.items : []);
        setTotal(Number(data.total) || 0);
        setTotalPages(Math.max(1, Number(data.totalPages) || 1));
      }
    } catch (err) {
      setError(err.response?.data?.message || "Không tải được danh sách booking");
      setBookings([]);
      setTotal(0);
      setTotalPages(1);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBookings();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, pageSize, statusParam, debouncedSearch]);

  const confirmBooking = async (id) => {
    try {
      const token = localStorage.getItem("token");
      await axios.put(`/api/bookings/${id}/confirm`, null, {
        headers: { Authorization: `Bearer ${token}` },
      });
      alert("Đã xác nhận booking (đã nhận đủ tiền cọc).");
      loadBookings();
    } catch (err) {
      alert(err.response?.data?.message || "Không xác nhận được booking");
    }
  };

  const cancelBooking = async (booking) => {
    const id = booking?._id;
    if (!id) return;
    const refundAmount = estimateRefundForBooking(booking);
    const paidDeposit = Math.max(0, Number(booking?.deposit_paid_amount) || 0);
    const outcomeText =
      refundAmount > 0
        ? `Dự kiến: hoàn ${refundAmount.toLocaleString("vi-VN")} đ (chuyển trạng thái chờ hoàn tiền).`
        : paidDeposit > 0
          ? "Dự kiến: mất cọc theo chính sách."
          : "Booking này chưa có tiền cọc để hoàn.";

    if (!window.confirm(`Xác nhận hủy booking?\n${outcomeText}`)) return;
    const reason = window.prompt("Lý do hủy (tùy chọn):", "") || "";
    try {
      const token = localStorage.getItem("token");
      await axios.put(
        `/api/bookings/${id}/cancel`,
        { reason },
        { headers: { Authorization: `Bearer ${token}` } },
      );
      alert("Đã hủy booking. Đã áp dụng chính sách hoàn/giữ cọc theo điều khoản.");
      loadBookings();
    } catch (err) {
      alert(err.response?.data?.message || "Không hủy được booking");
    }
  };

  const markNoShow = async (id) => {
    if (!window.confirm("Đánh dấu NO-SHOW? Tiền cọc sẽ bị giữ và phát sinh hóa đơn unpaid.")) return;
    try {
      const token = localStorage.getItem("token");
      await axios.put(`/api/bookings/${id}/no-show`, null, {
        headers: { Authorization: `Bearer ${token}` },
      });
      alert("Đã đánh dấu no-show.");
      loadBookings();
    } catch (err) {
      alert(err.response?.data?.message || "Không đánh dấu no-show được");
    }
  };

  const removeBooking = async (id) => {
    if (!window.confirm("Xóa booking này?")) return;
    try {
      const token = localStorage.getItem("token");
      await axios.delete(`/api/bookings/${id}`, {
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
      const res = await axios.get(`/api/bookings/${bookingId}/invoice`, {
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
      { key: "s1", label: "Chờ xác nhận" },
      { key: "s2", label: "Đã xác nhận" },
      { key: "s3", label: "Check-in" },
      { key: "s4", label: "Check-out" },
    ];
    if (status === "cancelled") {
      return (
        <div className="booking-admin-flow booking-admin-flow--compact booking-admin-flow--cancelled">
          <span>Đã hủy</span>
        </div>
      );
    }
    let currentIdx = -1;
    if (status === "pending") currentIdx = 0;
    else if (status === "confirmed") currentIdx = 1;
    else if (status === "checked_in") currentIdx = 2;
    else if (status === "checked_out" || status === "completed") currentIdx = 3;

    return (
      <div className="booking-admin-flow booking-admin-flow--compact" aria-label="Stay flow">
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

  const renderBookingCard = (b) => {
    const email = b.guest_email || b.user_id?.email || "—";
    const phone = b.guest_phone || b.user_id?.phone || "";

    return (
      <article key={b._id} className="booking-admin-card">
        <header className="ba-card-head">
          <div className="ba-card-head-left">
            <div className="ba-card-title">
              {b.guest_name || b.user_id?.name || "—"}
              <span className="ba-card-id">#{String(b._id || "").slice(-6).toUpperCase()}</span>
            </div>
            <dl className="ba-card-meta">
              <div className="ba-card-meta-row">
                <dt className="ba-meta-label">Lưu trú</dt>
                <dd className="ba-meta-value">
                  {formatDate(b.check_in_date)} <span className="ba-meta-sep">→</span> {formatDate(b.check_out_date)}
                </dd>
              </div>
              <div className="ba-card-meta-row">
                <dt className="ba-meta-label">Email</dt>
                <dd className="ba-meta-value ba-meta-value--truncate" title={email !== "—" ? email : undefined}>
                  {email}
                </dd>
              </div>
              {phone ? (
                <div className="ba-card-meta-row">
                  <dt className="ba-meta-label">SĐT</dt>
                  <dd className="ba-meta-value">{phone}</dd>
                </div>
              ) : null}
            </dl>
          </div>
          <div className="ba-card-head-right">
            <div className="ba-card-badges">
              <span className={`booking-admin-status ${b.status}`}>{statusLabelVi(b.status)}</span>
              {b.status === "checked_out" || b.status === "completed" ? (
                <span className={`booking-admin-review-badge ${b.isReviewed ? "reviewed" : "pending-review"}`}>
                  {b.isReviewed ? "Đã đánh giá" : "Chưa đánh giá"}
                </span>
              ) : null}
            </div>
          </div>
        </header>

        <div className="ba-card-body">
          {stayFlowStep(b.status)}

          <div className="ba-card-panel">
            <div className="ba-card-grid">
              <div className="ba-kv">
                <div className="ba-k">Loại phòng</div>
                <div className="ba-v">{b.room_type_id?.name || b.room_id?.name || "—"}</div>
              </div>
              <div className="ba-kv">
                <div className="ba-k">Phòng gán</div>
                <div className="ba-v">
                  {Array.isArray(b.assigned_room_ids) && b.assigned_room_ids.length > 0
                    ? b.assigned_room_ids
                        .map((r) => `${r?.name || ""}${r?.room_no ? ` (${r.room_no})` : ""}`.trim())
                        .filter(Boolean)
                        .join(", ")
                    : b.assigned_room_id?.name
                      ? `${b.assigned_room_id.name}${b.assigned_room_id.room_no ? ` (${b.assigned_room_id.room_no})` : ""}`
                      : "Chưa xếp (check-in)"}
                </div>
              </div>
            </div>

            <div className="ba-money">
              <div className="ba-money-row">
                <span>Tổng tiền</span>
                <strong>{(Number(b.total_price) || 0).toLocaleString("vi-VN")} đ</strong>
              </div>
              <div className="ba-money-row ba-money-row--sub">
                <span>Tiền cọc</span>
                <span>
                  <strong>{(Number(b.deposit_paid_amount) || 0).toLocaleString("vi-VN")} đ</strong> /{" "}
                  {(Number(b.deposit_amount) || 0).toLocaleString("vi-VN")} đ{" "}
                  <span className={`ba-dep ${String(b.deposit_status || "unpaid") === "paid" ? "ok" : ""}`}>
                    {depositStatusLabelVi(b.deposit_status)}
                  </span>
                </span>
              </div>
            </div>
          </div>
        </div>

        <footer className="booking-admin-actions ba-actions">
          <div className="ba-actions-primary">
            {b.status === "pending" && (
              <button
                type="button"
                className="ba-btn ba-btn--primary"
                onClick={() => confirmBooking(b._id)}
                disabled={String(b.deposit_status) !== "paid"}
                title={String(b.deposit_status) !== "paid" ? "Chưa nhận đủ tiền cọc" : ""}
              >
                Xác nhận (đủ cọc)
              </button>
            )}
            {b.status === "confirmed" && (
              <Link className="ba-btn ba-btn--primary" to={`/admin/check-in?bookingId=${b._id}`}>
                Check-in
              </Link>
            )}
            {b.status === "checked_in" && (
              <Link className="ba-btn ba-btn--primary" to={`/admin/check-out?bookingId=${b._id}`}>
                Check-out & hóa đơn
              </Link>
            )}
            {b.status === "checked_in" && (
              <Link to={`/admin/service-manager?bookingId=${b._id}`} className="ba-btn ba-btn--secondary">
                Dịch vụ phát sinh
              </Link>
            )}
            {(b.status === "checked_out" || b.status === "completed") &&
              (b.invoice_id?._id || b.invoice_id) && (
                <button
                  type="button"
                  className="ba-btn ba-btn--secondary"
                  onClick={() => downloadInvoiceAsAdmin(b._id)}
                  disabled={Boolean(downloadingInvoiceByBooking[b._id])}
                >
                  {downloadingInvoiceByBooking[b._id] ? "Đang xuất…" : "Xuất PDF hóa đơn"}
                </button>
              )}
          </div>
          {b.status === "confirmed" ? (
            <div className="ba-actions-secondary">
              <button type="button" className="ba-btn ba-btn--secondary" onClick={() => markNoShow(b._id)}>
                No-show
              </button>
            </div>
          ) : null}
          <div className="ba-actions-risk">
            {/* {b.status !== "checked_out" && b.status !== "completed" && (
              <button type="button" className="btn-cancel" onClick={() => cancelBooking(b)}>
                Hủy booking
              </button>
            )} */}
            <button type="button" className="ba-btn ba-btn--danger" onClick={() => removeBooking(b._id)}>
              Xóa
            </button>
          </div>
        </footer>
      </article>
    );
  };

  if (error) {
    return (
      <div className="booking-admin-page">
        <h2>Quản lý booking</h2>
        <p className="booking-admin-error">{error}</p>
      </div>
    );
  }

  const rangeFrom = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const rangeTo = Math.min(page * pageSize, total);

  return (
    <div className="booking-admin-page">
      <h2>Quản lý booking</h2>
      <div className="booking-toolbar">
        <label className="booking-search">
          <span className="booking-search-label">Tìm booking</span>
          <input
            type="search"
            className="booking-search-input"
            placeholder="Tên khách, email, SĐT, CCCD, tên tài khoản hoặc mã (#6 ký tự)…"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            autoComplete="off"
          />
        </label>
        <button type="button" className="booking-search-clear" onClick={() => setSearchInput("")} disabled={!searchInput}>
          Xóa tìm
        </button>
      </div>
      {loading && bookings.length === 0 ? <p className="booking-admin-loading">Đang tải booking…</p> : null}
      {loading && bookings.length > 0 ? <p className="booking-inline-loading">Đang cập nhật…</p> : null}
      <Outlet
        context={{
          bookings,
          total,
          loading,
          renderBookingCard,
        }}
      />
      {total > 0 ? (
        <nav className="booking-pagination" aria-label="Phân trang danh sách booking">
          <button type="button" className="booking-page-btn" disabled={page <= 1 || loading} onClick={() => setPage((p) => Math.max(1, p - 1))}>
            ← Trang trước
          </button>
          <div className="booking-pagination-meta">
            <span>
              {rangeFrom}–{rangeTo} / {total}
            </span>
            <span className="booking-pagination-pages">
              Trang {page}/{totalPages}
            </span>
          </div>
          <button
            type="button"
            className="booking-page-btn"
            disabled={page >= totalPages || loading}
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
          >
            Trang sau →
          </button>
        </nav>
      ) : null}
    </div>
  );
}
