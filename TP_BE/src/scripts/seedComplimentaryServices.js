import dotenv from "dotenv";
import mongoose from "mongoose";
import Service from "../models/Service.js";

dotenv.config();

const MONGO_URI =
  process.env.MONGO_URI ||
  process.env.MONGODB_URI ||
  "mongodb://127.0.0.1:27017/thinhphathotel";

const DEFAULT_ITEMS = ["Minibar", "Bồn tắm", "Wifi", "Điều hòa", "Ban công", "TV"];

async function upsertComplimentaryService(name) {
  const normalized = String(name || "").trim();
  if (!normalized) return { name: normalized, status: "skipped" };

  const existing = await Service.findOne({
    name: { $regex: `^${normalized.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, $options: "i" },
  });

  if (!existing) {
    const created = await Service.create({
      name: normalized,
      kind: "complimentary",
      defaultPrice: 0,
      category_id: null,
      unit: "",
      description: "Dịch vụ miễn phí đi kèm phòng.",
      isActive: true,
    });
    return { name: created.name, status: "created" };
  }

  existing.kind = "complimentary";
  existing.defaultPrice = 0;
  existing.isActive = true;
  if (!existing.description) existing.description = "Dịch vụ miễn phí đi kèm phòng.";
  await existing.save();
  return { name: existing.name, status: "updated" };
}

async function main() {
  await mongoose.connect(MONGO_URI, { serverSelectionTimeoutMS: 8000 });

  const results = [];
  for (const item of DEFAULT_ITEMS) {
    // eslint-disable-next-line no-await-in-loop
    const rs = await upsertComplimentaryService(item);
    results.push(rs);
  }

  const created = results.filter((x) => x.status === "created").length;
  const updated = results.filter((x) => x.status === "updated").length;

  console.log(
    JSON.stringify(
      {
        ok: true,
        created,
        updated,
        items: results,
      },
      null,
      2,
    ),
  );
}

main()
  .then(async () => {
    await mongoose.disconnect();
    process.exit(0);
  })
  .catch(async (e) => {
    console.error(e);
    try {
      await mongoose.disconnect();
    } catch {
      // ignore
    }
    process.exit(1);
  });
