const fs = require("fs");
const p = "d:/DATN/DATN/TP_FE/src/admin/pages/BookingAdmin.jsx";
const lines = fs.readFileSync(p, "utf8").split(/\r?\n/);
for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('key: "s1"')) {
    lines[i] = '      { key: "s1", label: "Cho xac nhan" },';
  }
  if (lines[i].trim().startsWith("<span>") && lines[i].includes("lưu trú")) {
    lines[i] = "          <span>Cancelled</span>";
  }
  if (lines[i].includes('className="booking-admin-flow"') && lines[i].includes("aria-label")) {
    lines[i] = '      <div className="booking-admin-flow" aria-label="Stay flow">';
  }
  if (lines[i].includes("toLocaleString") && lines[i].includes("total_price")) {
    lines[i] =
      '        <strong>Tong tien:</strong> {(b.total_price || 0).toLocaleString("vi-VN")} đ';
  }
  if (lines[i].includes('case "cancelled":')) {
    const next = lines[i + 1];
    if (next && next.includes("return")) {
      lines[i + 1] = '      return "Da huy";';
    }
  }
}
fs.writeFileSync(p, lines.join("\n"));
console.log("ok");
