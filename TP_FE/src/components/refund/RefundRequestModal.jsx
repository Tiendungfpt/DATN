import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { computeRefundBreakdown, resolveRefundOriginalAmountFromBooking } from "../../utils/refundPolicy.js";
import { useRefund } from "../../hooks/useRefund.js";

function roomLabel(booking) {
  const firstLi = Array.isArray(booking?.line_items) ? booking.line_items[0] : null;
  if (firstLi?.room_type_id?.name) return firstLi.room_type_id.name;
  if (booking?.room_type_id?.name) return booking.room_type_id.name;
  if (booking?.assigned_room_id?.name) return booking.assigned_room_id.name;
  if (booking?.room_id?.name) return booking.room_id.name;
  return "Đặt phòng";
}

function formatDt(v) {
  if (!v) return "—";
  return new Date(v).toLocaleDateString("vi-VN");
}

/**
 * Modal yêu cầu huỷ + hoàn tiền — preview policy trước khi POST /api/refunds/request.
 *
 * @param {{
 *   booking: Record<string, unknown> | null,
 *   isOpen: boolean,
 *   onClose: () => void,
 *   onSuccess: (message?: string, payload?: unknown) => void,
 * }} props
 */
export default function RefundRequestModal({ booking, isOpen, onClose, onSuccess }) {
  const { requestRefund, loading, error, resetError } = useRefund();
  const [reason, setReason] = useState("");
  const [payoutMethod, setPayoutMethod] = useState("momo");
  const [payoutPhone, setPayoutPhone] = useState("");
  const [payoutBankName, setPayoutBankName] = useState("");
  const [payoutBankAccountName, setPayoutBankAccountName] = useState("");
  const [payoutBankAccountNumber, setPayoutBankAccountNumber] = useState("");
  const canUseDom = typeof window !== "undefined" && typeof document !== "undefined";

  useEffect(() => {
    if (isOpen) {
      setReason("");
      setPayoutMethod("momo");
      setPayoutPhone("");
      setPayoutBankName("");
      setPayoutBankAccountName("");
      setPayoutBankAccountNumber("");
      resetError();
    }
  }, [isOpen, resetError]);

  const shouldRender = Boolean(isOpen && booking && canUseDom);
  const mountNode = useMemo(() => (shouldRender ? document.body : null), [shouldRender]);
  if (!shouldRender) return null;

  const original = resolveRefundOriginalAmountFromBooking(booking);
  const preview = computeRefundBreakdown(new Date(), booking.check_in_date, original);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const r = String(reason || "").trim();
    if (!r) {
      alert("Vui lòng nhập lý do hủy.");
      return;
    }
    const pm = String(payoutMethod || "").trim().toLowerCase();
    if (preview.refundAmount > 0) {
      if (pm === "momo" && !String(payoutPhone || "").trim()) {
        alert("Vui lòng nhập số điện thoại MoMo để nhận tiền hoàn.");
        return;
      }
      if (pm === "bank" && (!String(payoutBankName || "").trim() || !String(payoutBankAccountNumber || "").trim())) {
        alert("Vui lòng nhập ngân hàng và số tài khoản để nhận tiền hoàn.");
        return;
      }
    }
    try {
      const resp = await requestRefund(booking._id, r, {
        payoutMethod: pm,
        payoutPhone: String(payoutPhone || "").trim(),
        payoutBankName: String(payoutBankName || "").trim(),
        payoutBankAccountName: String(payoutBankAccountName || "").trim(),
        payoutBankAccountNumber: String(payoutBankAccountNumber || "").trim(),
      });
      const msg = String(resp?.message || "").trim();
      onSuccess(msg, resp);
      onClose();
    } catch {
      /* error hiển thị dưới form */
    }
  };

  return createPortal(
    <>
      <div className="modal-backdrop fade show" style={{ zIndex: 1050 }} />
      <div
        className="modal show"
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        style={{ display: "block", zIndex: 1055 }}
        onMouseDown={(e) => {
          if (e.target === e.currentTarget) onClose();
        }}
      >
        <div className="modal-dialog modal-dialog-centered modal-lg">
          <div className="modal-content rounded-4 shadow border-0">
            <div className="modal-header border-0 pb-0">
              <h5 className="modal-title fw-bold">Hủy đặt phòng &amp; yêu cầu hoàn tiền</h5>
              <button type="button" className="btn-close" aria-label="Đóng" onClick={onClose} disabled={loading} />
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body pt-2">
                <div className="alert alert-light border rounded-3 small">
                  <div className="fw-semibold mb-1">{roomLabel(booking)}</div>
                  <div className="text-muted">
                    Nhận phòng: <strong>{formatDt(booking.check_in_date)}</strong> — Trả phòng:{" "}
                    <strong>{formatDt(booking.check_out_date)}</strong>
                  </div>
                  <div className="mt-2">
                    Căn cứ đã thanh toán (ước tính):{" "}
                    <strong>{original.toLocaleString("vi-VN")} ₫</strong>
                  </div>
                  <div className="mt-2">
                    Phí hủy (theo chính sách):{" "}
                    <strong className="text-danger">{preview.cancellationFee.toLocaleString("vi-VN")} ₫</strong>
                  </div>
                  <div>
                    Dự kiến hoàn lại:{" "}
                    <strong className="text-success">{preview.refundAmount.toLocaleString("vi-VN")} ₫</strong>
                  </div>
                  <div className="mt-2 text-muted">
                    Lưu ý: sau khi xác nhận, booking sẽ chuyển sang{" "}
                    <strong>đã hủy</strong> và admin sẽ duyệt hoàn tiền thủ công theo chính sách.
                  </div>
                </div>

                {preview.refundAmount > 0 ? (
                  <div className="border rounded-3 p-3 mb-3">
                    <div className="fw-semibold mb-2">Thông tin nhận tiền hoàn</div>
                    <div className="row g-2 align-items-end">
                      <div className="col-12 col-md-4">
                        <label className="form-label mb-1">Hình thức</label>
                        <select
                          className="form-select rounded-3"
                          value={payoutMethod}
                          onChange={(e) => setPayoutMethod(e.target.value)}
                          disabled={loading}
                        >
                          <option value="momo">MoMo</option>
                          <option value="bank">Chuyển khoản ngân hàng</option>
                          <option value="cash">Tiền mặt</option>
                          <option value="other">Khác</option>
                        </select>
                      </div>

                      {String(payoutMethod) === "momo" ? (
                        <div className="col-12 col-md-8">
                          <label className="form-label mb-1">SĐT MoMo *</label>
                          <input
                            className="form-control rounded-3"
                            value={payoutPhone}
                            onChange={(e) => setPayoutPhone(e.target.value)}
                            placeholder="Ví dụ: 09xxxxxxxx"
                            disabled={loading}
                          />
                        </div>
                      ) : null}

                      {String(payoutMethod) === "bank" ? (
                        <>
                          <div className="col-12 col-md-4">
                            <label className="form-label mb-1">Ngân hàng *</label>
                            <input
                              className="form-control rounded-3"
                              value={payoutBankName}
                              onChange={(e) => setPayoutBankName(e.target.value)}
                              placeholder="Ví dụ: Vietcombank"
                              disabled={loading}
                            />
                          </div>
                          <div className="col-12 col-md-4">
                            <label className="form-label mb-1">Số tài khoản *</label>
                            <input
                              className="form-control rounded-3"
                              value={payoutBankAccountNumber}
                              onChange={(e) => setPayoutBankAccountNumber(e.target.value)}
                              placeholder="Ví dụ: 0123456789"
                              disabled={loading}
                            />
                          </div>
                          <div className="col-12 col-md-4">
                            <label className="form-label mb-1">Chủ tài khoản</label>
                            <input
                              className="form-control rounded-3"
                              value={payoutBankAccountName}
                              onChange={(e) => setPayoutBankAccountName(e.target.value)}
                              placeholder="Tên người nhận"
                              disabled={loading}
                            />
                          </div>
                        </>
                      ) : null}
                    </div>
                    <div className="text-muted small mt-2">
                      Admin sẽ kiểm tra và hoàn tiền thủ công theo thông tin bạn cung cấp.
                    </div>
                  </div>
                ) : null}

                <label className="form-label fw-semibold">Lý do hủy *</label>
                <textarea
                  className="form-control rounded-3"
                  rows={4}
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  required
                  placeholder="Ví dụ: thay đổi lịch trình, lý do cá nhân..."
                  disabled={loading}
                />

                {error ? (
                  <div className="alert alert-danger mt-3 mb-0 py-2 small" role="alert">
                    {error}
                  </div>
                ) : null}
              </div>
              <div className="modal-footer border-0 pt-0">
                <button
                  type="button"
                  className="btn btn-outline-secondary rounded-3"
                  onClick={onClose}
                  disabled={loading}
                >
                  Đóng
                </button>
                <button type="submit" className="btn btn-danger rounded-3 px-4" disabled={loading}>
                  {loading ? "Đang gửi…" : "Xác nhận hủy"}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </>,
    mountNode,
  );
}
