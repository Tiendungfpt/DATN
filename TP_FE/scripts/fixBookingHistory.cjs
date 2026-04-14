const fs = require("fs");
const p = "d:/DATN/DATN/TP_FE/src/pages/Profile/Component/BookingHistory.jsx";
let s = fs.readFileSync(p, "utf8");
const oldBlock = `                     {/* ✅ Trạng thái v��n giữ nguyên */}
{booking.status === "completed" && (
  <div className="text-success fw-semibold fs-5 py-3">
    <i className="bi bi-check-circle-fill me-2"></�ã trả phòng
  </div>
)�� ��ánh giá (ch�� khi completed) */}
{booking.status === "completed" && (
  <Link
    to={\`/review/\${booking._id}?roomId=\${(booking.assigned_room_id?._id || booking.room_id?._id)}\`}
    className="btn btn-primary mt-2"
  >
    ��� ��ánh giá
  </Link>
)� Xem đánh giá (LU��N HI��N TH��) */}
<Link
  to={\`/phong/\${booking.assigned_room_id?._id || booking.room_id?._id}\`}
  className="btn btn-primary mt-2"
>
  �� Xem đánh giá
</Link>

`;
const newBlock = `                      {isStayFinished(booking.status) && (
                        <div className="text-success fw-semibold fs-5 py-3">
                          <i className="bi bi-check-circle-fill me-2"></�ã trả phòng
                        </div>
                      )}

                      {isStayFinished(booking.status) && primaryRoomId(booking) && (
                        <Link
                          to={\`/review/\${booking._id}?roomId=\${primaryRoomId(booking)}\`}
                          className="btn btn-primary mt-2"
                        >
                          ��ánh giá
                        </Link>
                      )}

                      {primaryRoomId(booking) ? (
                        <Link
                          to={\`/phong/\${primaryRoomId(booking)}\`}
                          className="btn btn-primary mt-2"
                        >
                          Xem đánh giá phòng
                        </Link>
                      ) : null}

`;
if (!s.includes(oldBlock.trim().slice(0, 40))) {
  console.error("block1 not found");
  process.exit(1);
}
s = s.replace(oldBlock, newBlock);
const invOld = `                      {booking.invoice_issued_at ? (
                        <button
                          className="btn btn-outline-success mt-2"
                          onClick={() => handleDownloadInvoice(booking._id)}
                        >
                          <i className="bi bi-receipt me-2"></i>
                          Tải hóa đơn
                        </button>
                      ) : (
                        <div className="text-muted small mt-2">
                          Hóa đơn s�� hiển thị sau khi admin phát hành.
                        </div>
                      )}`;
const invNew = `                      {isStayFinished(booking.status) && booking.invoice_id ? (
                        <button
                          className="btn btn-outline-success mt-2"
                          onClick={() => handleDownloadInvoice(booking._id)}
                        >
                          <i className="bi bi-receipt me-2"></i>
                          Tải hóa đơn
                        </button>
                      ) : (
                        <div className="text-muted small mt-2">Hóa đơn sau khi check-out.</div>
                      )}`;
if (!s.includes("invoice_issued_at")) {
  console.error("invoice block not found");
  process.exit(1);
}
s = s.replace(invOld, invNew);
s = s.replace(
  "Booking đang ch�� admin xếp phòng c�� thể.",
  "Loại phòng đã chọn; số phòng gán khi check-in.",
);
fs.writeFileSync(p, s);
console.log("ok");
