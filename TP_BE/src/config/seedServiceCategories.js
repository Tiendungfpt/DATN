import ServiceCategory from "../models/ServiceCategory.js";

/** Nhóm mặc định cho catalog dịch vụ phát sinh (idempotent, chỉ insert khi chưa có code). */
const DEFAULT_SERVICE_CATEGORIES = [
  { code: "food", name: "Ăn uống" },
  { code: "beverage", name: "Đồ uống" },
  { code: "laundry", name: "Giặt là" },
  { code: "transport", name: "Đón tiễn / di chuyển" },
  { code: "wellness", name: "Spa / Massage" },
  { code: "amenity", name: "Tiện ích phòng / minibar" },
  { code: "other", name: "Khác" },
];

export async function ensureDefaultServiceCategories() {
  let inserted = 0;
  for (const row of DEFAULT_SERVICE_CATEGORIES) {
    const code = String(row.code || "").trim();
    const name = String(row.name || "").trim();
    if (!code || !name) continue;
    // eslint-disable-next-line no-await-in-loop
    const res = await ServiceCategory.updateOne(
      { code },
      { $setOnInsert: { code, name, isActive: true } },
      { upsert: true },
    );
    if (res?.upsertedCount) inserted += 1;
  }
  if (inserted > 0) {
    console.log(`✅ Đã khởi tạo ${inserted} nhóm dịch vụ mặc định (service categories)`);
  }
}
