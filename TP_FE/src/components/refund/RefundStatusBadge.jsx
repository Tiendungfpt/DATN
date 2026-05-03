/**
 * Badge trạng thái hoàn tiền — đồng bộ palette Bootstrap.
 *
 * @param {{ status?: string }} props
 */
export default function RefundStatusBadge({ status }) {
  const s = String(status || "").toLowerCase();
  const map = {
    pending: "text-bg-warning",
    processing: "text-bg-info",
    success: "text-bg-success",
    failed: "text-bg-danger",
  };
  const cls = map[s] || "text-bg-secondary";

  const labelVi =
    {
      pending: "Chờ xử lý",
      processing: "Đang xử lý",
      success: "Đã hoàn tiền",
      failed: "Thất bại",
    }[s] || s || "—";

  return <span className={`badge px-3 py-2 rounded-pill fw-semibold ${cls}`}>{labelVi}</span>;
}
