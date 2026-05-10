import { useEffect, useState } from "react";
import axios from "axios";
import RefundStatusBadge from "../../components/refund/RefundStatusBadge.jsx";
import "../components/BookingAdmin.css";
import "./RefundAdmin.css";

function formatDate(d) {
  if (!d) return "—";
  return new Date(d).toLocaleString("vi-VN");
}

function normalizePaymentMethod(raw) {
  return String(raw || "").trim().toLowerCase();
}

/** Admin: luồng Refund module — manual approve/reject */
export default function RefundAdmin() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState("");
  const [statusFilter, setStatusFilter] = useState("pending");

  const token = typeof localStorage !== "undefined" ? localStorage.getItem("token") : "";

  const load = async () => {
    try {
      setLoading(true);
      setError("");
      const rNew = await axios.get("/api/refunds/admin/list", {
        headers: { Authorization: `Bearer ${token}` },
        params: { status: statusFilter },
      });
      setItems(Array.isArray(rNew.data?.items) ? rNew.data.items : []);
    } catch (err) {
      setError(err.response?.data?.message || "Không tải được danh sách hoàn tiền");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [statusFilter]);

  const approveRefund = async (row) => {
    const refundId = row?.id;
    if (!refundId) return;
    const pm = normalizePaymentMethod(row?.paymentMethod);
    const isMomo = pm === "momo";
    const ok = window.confirm(
      isMomo
        ? "Xác nhận duyệt và hoàn tiền qua MoMo tự động cho khách?"
        : "Xác nhận đã hoàn tiền (duyệt tay) cho khách?",
    );
    if (!ok) return;
    try {
      setBusyId(String(refundId));
      const manualRef = isMomo ? "" : window.prompt("Mã giao dịch/ghi chú đối soát (tuỳ chọn):", "") || "";
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

  const queryRefund = async (refundId) => {
    try {
      setBusyId(String(refundId));
      const res = await axios.post(
        `/api/refunds/admin/query/${refundId}`,
        {},
        { headers: { Authorization: `Bearer ${token}` } },
      );
      alert(res.data?.message || "Đã tra cứu.");
      await load();
    } catch (err) {
      alert(err.response?.data?.message || err.message || "Tra cứu thất bại");
      await load();
    } finally {
      setBusyId("");
    }
  };

  const retryRefund = async (refundId) => {
    if (!window.confirm("Thử lại gọi API hoàn tiền MoMo? (sau khi đã failed)")) return;
    try {
      setBusyId(String(refundId));
      const adminNote = window.prompt("Ghi chú admin (tuỳ chọn):", "") || "";
      const res = await axios.post(
        `/api/refunds/admin/retry/${refundId}`,
        { adminNote },
        { headers: { Authorization: `Bearer ${token}` } },
      );
      alert(res.data?.message || "Đã thử lại.");
      await load();
    } catch (err) {
      alert(err.response?.data?.message || err.message || "Thử lại thất bại");
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

  if (loading && items.length === 0)
    return <p className="refund-admin-loading">Đang tải danh sách hoàn tiền...</p>;
  if (error && items.length === 0)
    return <p className="refund-admin-error">{error}</p>;

  return (
    <div className="booking-admin-page refund-admin-page">
      <div className="refund-admin-header">
        <div>
          <h2>Quản lý hoàn tiền</h2>
          <div className="booking-admin-section-subtitle refund-admin-subtitle">
            Luồng nghiệp vụ: <strong>Duyệt</strong> → gọi API hoàn của cổng (MoMo) → cổng xử lý bất đồng bộ →{" "}
            <strong>Tra cứu</strong> / <strong>Thử lại</strong> nếu lỗi → cập nhật DB &amp; thông báo khách. Cổng khác:
            duyệt thủ công + đối soát.
          </div>
        </div>
        <div className="refund-admin-toolbar">
          <label className="refund-admin-filter">
            <span>Lọc trạng thái</span>
            <select
              className="refund-admin-select"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              disabled={loading}
            >
              <option value="pending">Đang chờ duyệt</option>
              <option value="processing">Đang xử lý cổng</option>
              <option value="completed">Hoàn tất</option>
              <option value="failed">Từ chối / lỗi</option>
              <option value="all">Tất cả</option>
            </select>
          </label>
        </div>
      </div>

      <section className="booking-admin-section">
        <div className="booking-admin-section-header">
          <h3>Yêu cầu hoàn tiền</h3>
          <span className="booking-admin-section-count">{items.length}</span>
        </div>
        <div className="booking-admin-section-subtitle">
          Nguồn dữ liệu: collection <strong>Refund</strong>.
        </div>

        {items.length === 0 ? (
          <div className="booking-admin-empty">Không có dữ liệu theo bộ lọc hiện tại.</div>
        ) : (
          <div className="booking-admin-grid">
            {items.map((row) => {
              const bid = row.booking?._id || row.bookingId;
              return (
                <article key={row.id} className="booking-admin-card">
                  <header className="ba-card-head">
                    <div className="ba-card-head-left">
                      <div className="ba-card-title">
                        Refund <span className="ba-card-id">#{String(row.id || "").slice(-6).toUpperCase()}</span>
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
                        {row.payoutMethod ? String(row.payoutMethod).toUpperCase() : "—"}
                        {row.payoutPhone ? ` · ${row.payoutPhone}` : ""}
                        {row.payoutBankName ? ` · ${row.payoutBankName}` : ""}
                        {row.payoutBankAccountNumber ? ` · ${row.payoutBankAccountNumber}` : ""}
                        {row.payoutBankAccountName ? ` · ${row.payoutBankAccountName}` : ""}
                      </span>
                    </div>
                    <div className="ba-money-row ba-money-row--sub">
                      <span>Thanh toán gốc</span>
                      <span>{row.paymentMethod ? String(row.paymentMethod).toUpperCase() : "—"}</span>
                    </div>
                    <div className="ba-money-row ba-money-row--sub">
                      <span>Mã hoàn/đối soát</span>
                      <span>{row.refundTransactionId ? String(row.refundTransactionId) : "—"}</span>
                    </div>
                    {Number(row.retryCount) > 0 ? (
                      <div className="ba-money-row ba-money-row--sub">
                        <span>Số lần thử lại</span>
                        <span>{row.retryCount}</span>
                      </div>
                    ) : null}
                    {row.providerRefundOrderId ? (
                      <div className="ba-money-row ba-money-row--sub">
                        <span>MoMo orderId (refund)</span>
                        <span className="text-break">{row.providerRefundOrderId}</span>
                      </div>
                    ) : null}
                  {row.provider ? (
                    <div className="ba-money-row ba-money-row--sub">
                      <span>Kết quả cổng</span>
                      <span>
                        {String(row.provider).toUpperCase()}
                        {row.providerResultCode != null ? ` · code ${row.providerResultCode}` : ""}
                        {row.providerMessage ? ` · ${row.providerMessage}` : ""}
                      </span>
                    </div>
                  ) : null}
                    {String(row.adminNote || "").trim() ? (
                      <div className="ba-money-row ba-money-row--sub">
                        <span>Ghi chú admin</span>
                        <span>{row.adminNote}</span>
                      </div>
                    ) : null}
                    {String(row.failureMessage || "").trim() ? (
                      <div className="ba-money-row ba-money-row--sub text-danger">
                        <span>Lỗi</span>
                        <span>
                          {row.failureMessage}
                          {normalizePaymentMethod(row?.paymentMethod) === "momo"
                            ? " (Gợi ý: kiểm tra transId gốc của giao dịch MoMo và cấu hình MOMO_* trên server.)"
                            : ""}
                        </span>
                      </div>
                    ) : null}
                  </div>

                  <div className="booking-admin-actions ba-actions">
                    <button
                      type="button"
                      className="ba-btn ba-btn--primary"
                      disabled={busyId === row.id || row.status !== "pending"}
                      onClick={() => approveRefund(row)}
                    >
                      {busyId === row.id
                        ? "Đang xử lý…"
                        : normalizePaymentMethod(row?.paymentMethod) === "momo"
                          ? "Duyệt & hoàn MoMo"
                          : "Duyệt (đã hoàn tiền)"}
                    </button>
                    {row.status === "processing" && normalizePaymentMethod(row?.paymentMethod) === "momo" ? (
                      <button
                        type="button"
                        className="ba-btn ba-btn--secondary"
                        disabled={busyId === row.id}
                        onClick={() => queryRefund(row.id)}
                      >
                        Tra cứu MoMo
                      </button>
                    ) : null}
                    {row.status === "failed" && normalizePaymentMethod(row?.paymentMethod) === "momo" ? (
                      <button
                        type="button"
                        className="ba-btn ba-btn--secondary"
                        disabled={busyId === row.id}
                        onClick={() => retryRefund(row.id)}
                      >
                        Thử lại MoMo
                      </button>
                    ) : null}
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
      </section>
    </div>
  );
}
