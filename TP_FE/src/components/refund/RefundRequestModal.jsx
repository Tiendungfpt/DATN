import { useEffect, useState } from "react";
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
 *   onSuccess: () => void,
 * }} props
 */
export default function RefundRequestModal({ booking, isOpen, onClose, onSuccess }) {
  const { requestRefund, loading, error, resetError } = useRefund();
  const [reason, setReason] = useState("");

  useEffect(() => {
    if (isOpen) {
      setReason("");
      resetError();
    }
  }, [isOpen, resetError]);

  if (!isOpen || !booking) return null;

  const original = resolveRefundOriginalAmountFromBooking(booking);
  const preview = computeRefundBreakdown(new Date(), booking.check_in_date, original);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const r = String(reason || "").trim();
    if (!r) {
      alert("Vui lòng nhập lý do hủy.");
      return;
    }
    try {
      await requestRefund(booking._id, r);
      onSuccess();
      onClose();
    } catch {
      /* error hiển thị dưới form */
    }
  };

  return (
    <div className="modal show d-block" tabIndex={-1} style={{ background: "rgba(0,0,0,0.45)" }}>
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
                  <strong>đã hủy</strong> và yêu cầu hoàn tiền chờ hệ thống xử lý.
                </div>
              </div>

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
              <button type="button" className="btn btn-outline-secondary rounded-3" onClick={onClose} disabled={loading}>
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
  );
}
