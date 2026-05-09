import { useEffect, useState } from "react";
import { useRefund } from "../../hooks/useRefund.js";
import RefundStatusBadge from "../../components/refund/RefundStatusBadge.jsx";

function bookingCode(b) {
  const id = b?._id;
  if (!id) return "—";
  return `#${String(id).slice(-6).toUpperCase()}`;
}

/**
 * Trang lịch sử hoàn tiền — tab trong tài khoản.
 */
export default function RefundHistoryPage() {
  const { getMyRefunds, data, loading, error } = useRefund();
  const [started, setStarted] = useState(false);

  useEffect(() => {
    getMyRefunds()
      .catch(() => {})
      .finally(() => setStarted(true));
  }, [getMyRefunds]);

  const items = Array.isArray(data?.items) ? data.items : [];

  if (!started || (loading && items.length === 0)) {
    return (
      <div>
        <h2 className="fw-bold mb-4">Lịch sử hoàn tiền</h2>
        <div className="placeholder-glow">
          <div className="placeholder col-12 rounded-3 mb-3" style={{ height: 72 }} />
          <div className="placeholder col-12 rounded-3 mb-3" style={{ height: 72 }} />
          <div className="placeholder col-12 rounded-3" style={{ height: 72 }} />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="alert alert-danger" role="alert">
        {error}
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="text-center py-5">
        <h2 className="fw-bold mb-3">Lịch sử hoàn tiền</h2>
        <p className="text-muted mb-0">Bạn chưa có yêu cầu hoàn tiền nào.</p>
      </div>
    );
  }

  return (
    <div>
      <h2 className="fw-bold mb-4">Lịch sử hoàn tiền</h2>
      <div className="table-responsive">
        <table className="table align-middle">
          <thead className="table-light">
            <tr>
              <th>Mã đặt phòng</th>
              <th>Số tiền hoàn</th>
              <th>Ngày yêu cầu</th>
              <th>Trạng thái</th>
            </tr>
          </thead>
          <tbody>
            {items.map((row) => (
              <tr key={row.id}>
                <td className="fw-semibold">{bookingCode(row.booking)}</td>
                <td>{Number(row.amount || 0).toLocaleString("vi-VN")} ₫</td>
                <td>
                  {row.createdAt
                    ? new Date(row.createdAt).toLocaleString("vi-VN")
                    : "—"}
                </td>
                <td>
                  <RefundStatusBadge status={row.status} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
