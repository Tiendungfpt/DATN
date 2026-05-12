import { useEffect, useState } from "react";
import axios from "axios";
import { useSearchParams, useNavigate } from "react-router-dom";
import "../components/BookingAdmin.css";

/**
 * GET /api/bookings/:id/checkout-preview
 * PUT /api/bookings/:id/check-out — totals + creates Invoice (never before this).
 */
export default function CheckOut() {
  const [params] = useSearchParams();
  const bookingId = params.get("bookingId") || "";
  const navigate = useNavigate();
  const [preview, setPreview] = useState(null);
  const [err, setErr] = useState("");
  const [msg, setMsg] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [payMethod, setPayMethod] = useState("cash");
  const [overrideTimeWindow, setOverrideTimeWindow] = useState(false);

  const token = () => ({ Authorization: `Bearer ${localStorage.getItem("token")}` });

  useEffect(() => {
    if (!bookingId) return;
    (async () => {
      try {
        const res = await axios.get(`/api/bookings/${bookingId}/folio`, { headers: token() });
        setPreview(res.data);
      } catch (e) {
        setErr(e.response?.data?.message || "Không tải được dữ liệu thanh toán.");
      }
    })();
  }, [bookingId]);

  const settle = async () => {
    setErr("");
    setMsg("");
    setSubmitting(true);
    try {
      await axios.put(
        `/api/bookings/${bookingId}/check-out`,
        { payment_method: payMethod, settle_balance: true, override_time_window: overrideTimeWindow },
        { headers: token() },
      );
      setMsg("Trả phòng thành công. Hóa đơn đã được tạo.");
      setTimeout(() => navigate("/admin/bookings/completed"), 700);
    } catch (e) {
      setErr(e.response?.data?.message || "Trả phòng thất bại.");
    } finally {
      setSubmitting(false);
    }
  };

  if (!bookingId) return <p className="booking-admin-empty">Thiếu mã booking trong URL.</p>;

  const currency = (v) => `${Number(v || 0).toLocaleString("vi-VN")} đ`;

  return (
    <section className="booking-admin-section co-shell">
      <div className="booking-admin-section-header">
        <div className="ba-head-with-back">
          <button type="button" className="ba-nav-back" onClick={() => navigate(-1)}>
            ← Trang trước
          </button>
          <h3>Trả phòng & hóa đơn</h3>
        </div>
        <span className="booking-admin-section-count">#{bookingId.slice(-6).toUpperCase()}</span>
      </div>
      <div className="booking-admin-section-subtitle">
        Xác nhận thanh toán số dư, đóng booking và tạo hóa đơn tự động.
      </div>

      {!preview && !err ? <div className="booking-admin-empty">Đang tải dữ liệu thanh toán...</div> : null}

      {preview ? (
        <div className="co-grid">
          <article className="co-card">
            <div className="co-card-head">Tổng quan thanh toán</div>
            <div className="co-card-body">
              <div className="co-row">
                <span>Tiền phòng</span>
                <strong>{currency(preview.room_subtotal)}</strong>
              </div>
              <div className="co-row">
                <span>Dịch vụ phát sinh</span>
                <strong>{currency(preview.service_subtotal)}</strong>
              </div>
              <div className="co-row">
                <span>Khách đã trả trước</span>
                <strong>{currency(preview.prepaid_amount)}</strong>
              </div>
              <div className="co-divider" />
              <div className="co-row co-row--grand">
                <span>Tổng cộng</span>
                <strong>{currency(preview.grand_total)}</strong>
              </div>
              <div className="co-row co-row--due">
                <span>Số dư còn lại</span>
                <strong>{currency(preview.balance_due)}</strong>
              </div>
            </div>
          </article>

          <article className="co-card">
            <div className="co-card-head">Xác nhận trả phòng</div>
            <div className="co-card-body">
              <div className="co-field">
                <label className="co-label">Phương thức thanh toán</label>
                <select
                  className="co-select"
                  value={payMethod}
                  onChange={(e) => setPayMethod(e.target.value)}
                  disabled={submitting}
                >
                  <option value="cash">Tiền mặt</option>
                  <option value="card">Thẻ (POS)</option>
                  <option value="momo">MoMo</option>
                </select>
              </div>

              <label className="co-checkbox">
                <input
                  type="checkbox"
                  checked={overrideTimeWindow}
                  onChange={(e) => setOverrideTimeWindow(e.target.checked)}
                  disabled={submitting}
                />
                <span>Cho phép trả phòng ngoài khung giờ (trước 12:00)</span>
              </label>

              <button type="button" className="co-submit" onClick={settle} disabled={submitting}>
                {submitting ? "Đang xử lý..." : "Thanh toán số dư & tạo hóa đơn"}
              </button>
            </div>
          </article>
        </div>
      ) : null}

      {msg ? <div className="co-alert co-alert--ok">{msg}</div> : null}
      {err ? <div className="co-alert co-alert--err">{err}</div> : null}
    </section>
  );
}
