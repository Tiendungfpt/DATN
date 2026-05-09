import { useEffect, useState } from "react";
import axios from "axios";
import RefundStatusBadge from "../../components/refund/RefundStatusBadge.jsx";

function formatDate(d) {
  if (!d) return "—";
  return new Date(d).toLocaleString("vi-VN");
}

/** Admin: luồng Refund module — manual approve/reject */
export default function RefundAdmin() {
  const [items, setItems] = useState([]);
  const [legacyItems, setLegacyItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState("");
  const [statusFilter, setStatusFilter] = useState("pending");

  const token = typeof localStorage !== "undefined" ? localStorage.getItem("token") : "";

  const load = async () => {
    try {
      setLoading(true);
      setError("");
      const [rNew, rLegacy] = await Promise.all([
        axios.get("/api/refunds/admin/list", {
          headers: { Authorization: `Bearer ${token}` },
          params: { status: statusFilter },
        }),
        axios.get("/api/bookings", {
          headers: { Authorization: `Bearer ${token}` },
          params: { deposit_status: "pending_refund", sort: "createdAt_desc" },
        }),
      ]);
      setItems(Array.isArray(rNew.data?.items) ? rNew.data.items : []);
      setLegacyItems(Array.isArray(rLegacy.data) ? rLegacy.data : []);
    } catch (err) {
      setError(err.response?.data?.message || "Không tải được danh sách hoàn tiền");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [statusFilter]);

  const approveRefund = async (refundId) => {
    if (!window.confirm("Xác nhận đã hoàn tiền (duyệt tay) cho khách?")) return;
    try {
      setBusyId(refundId);
      const manualRef = window.prompt("Mã giao dịch/ghi chú đối soát (tuỳ chọn):", "") || "";
      const adminNote = window.prompt("Ghi chú admin (tuỳ chọn):", "") || "";
      await axios.post(
        `/api/refunds/admin/approve/${refundId}`,
        { manualRef, adminNote },
        { headers: { Authorization: `Bearer ${token}` } },
      );
      await load();
    } catch (err) {
      alert(err.response?.data?.message || err.message || "Duyệt hoàn tiền thất bại");
      await load();
    } finally {
      setBusyId("");
    }
  };

  const rejectRefund = async (refundId) => {
    const reason = window.prompt("Lý do từ chối hoàn tiền:", "") || "";
    if (!window.confirm("Xác nhận từ chối hoàn tiền?")) return;
    try {
      setBusyId(refundId);
      const adminNote = window.prompt("Ghi chú admin (tuỳ chọn):", "") || "";
      await axios.post(
        `/api/refunds/admin/reject/${refundId}`,
        { reason, adminNote },
        { headers: { Authorization: `Bearer ${token}` } },
      );
      await load();
    } catch (err) {
      alert(err.response?.data?.message || err.message || "Từ chối hoàn tiền thất bại");
      await load();
    } finally {
      setBusyId("");
    }
  };

  const approveLegacyRefund = async (bookingId) => {
    if (!window.confirm("Xác nhận đã hoàn tiền (luồng cọc cũ)?")) return;
    try {
      setBusyId(String(bookingId));
      await axios.put(
        `/api/bookings/${bookingId}/confirm-refund`,
        {},
        { headers: { Authorization: `Bearer ${token}` } },
      );
      await load();
    } catch (err) {
      alert(err.response?.data?.message || "Không xác nhận hoàn tiền được");
    } finally {
      setBusyId("");
    }
  };

  const rejectLegacyRefund = async (bookingId) => {
    const reason = window.prompt("Lý do từ chối hoàn tiền:", "") || "";
    if (!window.confirm("Xác nhận từ chối hoàn tiền?")) return;
    try {
      setBusyId(String(bookingId));
      await axios.put(
        `/api/bookings/${bookingId}/reject-refund`,
        { reason },
        { headers: { Authorization: `Bearer ${token}` } },
      );
      await load();
    } catch (err) {
      alert(err.response?.data?.message || "Không từ chối hoàn tiền được");
    } finally {
      setBusyId("");
    }
  };

  if (loading && items.length === 0 && legacyItems.length === 0) return <p>Đang tải danh sách hoàn tiền...</p>;
  if (error && items.length === 0 && legacyItems.length === 0) return <p style={{ color: "crimson" }}>{error}</p>;

  return (
    <div className="booking-admin-page">
      <h2>Quản lý hoàn tiền</h2>

      <div className="booking-admin-section-subtitle mb-3 d-flex flex-wrap gap-2 align-items-center">
        <span className="text-muted">Lọc:</span>
        <select
          className="form-select"
          style={{ maxWidth: 240 }}
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          disabled={loading}
        >
          <option value="pending">Đang chờ duyệt</option>
          <option value="success">Đã hoàn xong</option>
          <option value="failed">Đã từ chối / lỗi</option>
          <option value="all">Tất cả</option>
        </select>
      </div>

      <h3 className="h5 mt-4 mb-3">Yêu cầu hoàn tiền (policy &amp; document Refund)</h3>
      {items.length === 0 ? (
        <div className="booking-admin-empty mb-4">Không có dữ liệu theo bộ lọc hiện tại.</div>
      ) : (
        <div className="booking-admin-grid mb-5">
          {items.map((row) => {
            const bid = row.booking?._id || row.bookingId;
            return (
              <article key={row.id} className="booking-admin-card">
                <header className="ba-card-head">
                  <div className="ba-card-head-left">
                    <div className="ba-card-title">
                      Refund{" "}
                      <span className="ba-card-id">
                        #{String(row.id || "").slice(-6).toUpperCase()}
                      </span>
                    </div>
                    <div className="ba-card-sub">
                      Booking #{String(bid || "").slice(-6).toUpperCase()} · {formatDate(row.createdAt)}
                    </div>
                  </div>
                  <div className="ba-card-head-right">
                    <RefundStatusBadge status={row.status} />
                  </div>
                </header>

                <div className="ba-money">
                  <div className="ba-money-row">
                    <span>Số tiền hoàn</span>
                    <strong>{(Number(row.amount) || 0).toLocaleString("vi-VN")} đ</strong>
                  </div>
                  <div className="ba-money-row ba-money-row--sub">
                    <span>Tổng gốc (policy)</span>
                    <strong>{(Number(row.originalAmount) || 0).toLocaleString("vi-VN")} đ</strong>
                  </div>
                  <div className="ba-money-row ba-money-row--sub">
                    <span>Phí hủy</span>
                    <strong>{(Number(row.cancellationFee) || 0).toLocaleString("vi-VN")} đ</strong>
                  </div>
                  <div className="ba-money-row ba-money-row--sub">
                    <span>Lý do</span>
                    <span>{String(row.reason || "—")}</span>
                  </div>
                  <div className="ba-money-row ba-money-row--sub">
                    <span>Thông tin nhận tiền</span>
                    <span>
                      {row.payoutMethod
                        ? String(row.payoutMethod).toUpperCase()
                        : "—"}
                      {row.payoutPhone ? ` · ${row.payoutPhone}` : ""}
                      {row.payoutBankName ? ` · ${row.payoutBankName}` : ""}
                      {row.payoutBankAccountNumber ? ` · ${row.payoutBankAccountNumber}` : ""}
                      {row.payoutBankAccountName ? ` · ${row.payoutBankAccountName}` : ""}
                    </span>
                  </div>
                  {String(row.failureMessage || "").trim() ? (
                    <div className="ba-money-row ba-money-row--sub text-danger">
                      <span>Lỗi</span>
                      <span>{row.failureMessage}</span>
                    </div>
                  ) : null}
                </div>

                <div className="booking-admin-actions ba-actions">
                  <button
                    type="button"
                    className="ba-btn ba-btn--primary"
                    disabled={busyId === row.id || row.status !== "pending"}
                    onClick={() => approveRefund(row.id)}
                  >
                    {busyId === row.id ? "Đang xử lý…" : "Duyệt (đã hoàn tiền)"}
                  </button>
                  <button
                    type="button"
                    className="ba-btn ba-btn--danger"
                    disabled={busyId === row.id || row.status !== "pending"}
                    onClick={() => rejectRefund(row.id)}
                  >
                    Từ chối
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      )}

      <h3 className="h5 mt-2 mb-3">Booking tiền cọc chờ hoàn (luồng cũ)</h3>
      <p className="booking-admin-section-subtitle">
        Danh sách booking có <strong>pending_refund</strong> trước khi có collection Refund.
      </p>

      {legacyItems.length === 0 ? (
        <div className="booking-admin-empty">Không có yêu cầu cọc đang chờ.</div>
      ) : (
        <div className="booking-admin-grid">
          {legacyItems.map((b) => (
            <article key={b._id} className="booking-admin-card">
              <header className="ba-card-head">
                <div className="ba-card-head-left">
                  <div className="ba-card-title">
                    {b.guest_name || b.user_id?.name || "—"}
                    <span className="ba-card-id">#{String(b._id || "").slice(-6).toUpperCase()}</span>
                  </div>
                  <div className="ba-card-sub">
                    {formatDate(b.check_in_date)} → {formatDate(b.check_out_date)}
                  </div>
                </div>
                <div className="ba-card-head-right">
                  <span className="booking-admin-status cancelled">Đã hủy</span>
                </div>
              </header>

              <div className="ba-money">
                <div className="ba-money-row">
                  <span>Số tiền yêu cầu hoàn</span>
                  <strong>{(Number(b.refund_requested_amount) || 0).toLocaleString("vi-VN")} đ</strong>
                </div>
                <div className="ba-money-row ba-money-row--sub">
                  <span>Tiền cọc đã nhận</span>
                  <strong>{(Number(b.deposit_paid_amount) || 0).toLocaleString("vi-VN")} đ</strong>
                </div>
              </div>

              <div className="booking-admin-actions ba-actions">
                <button
                  type="button"
                  className="ba-btn ba-btn--primary"
                  disabled={busyId === String(b._id)}
                  onClick={() => approveLegacyRefund(b._id)}
                >
                  Đã hoàn tiền
                </button>
                <button
                  type="button"
                  className="ba-btn ba-btn--danger"
                  disabled={busyId === String(b._id)}
                  onClick={() => rejectLegacyRefund(b._id)}
                >
                  Từ chối
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
