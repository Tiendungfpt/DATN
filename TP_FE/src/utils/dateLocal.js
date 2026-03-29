/** Ngày YYYY-MM-DD theo giờ máy (khớp input type="date"), tránh lệch ngày vì UTC khi dùng toISOString(). */
export function localISODate(d = new Date()) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function addDaysLocal(days) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return localISODate(d);
}
