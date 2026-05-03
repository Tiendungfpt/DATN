import dotenv from "dotenv";
import mongoose from "mongoose";
import RoomType from "../models/RoomType.js";

dotenv.config();

const MONGO_URI =
  process.env.MONGO_URI ||
  process.env.MONGODB_URI ||
  "mongodb://127.0.0.1:27017/thinhphathotel";

function picsum(seed) {
  // stable hotlink for testing (rarely 403)
  return `https://picsum.photos/seed/${encodeURIComponent(seed)}/1600/1000`;
}

function pickGallery(seedPrefix) {
  return [
    picsum(`${seedPrefix}-1`),
    picsum(`${seedPrefix}-2`),
    picsum(`${seedPrefix}-3`),
    picsum(`${seedPrefix}-4`),
    picsum(`${seedPrefix}-5`),
  ];
}

async function main() {
  await mongoose.connect(MONGO_URI, { serverSelectionTimeoutMS: 8000 });

  const force = String(process.argv.includes("--force")).includes("true");
  const types = await RoomType.find().sort({ createdAt: 1 }).lean();
  let updated = 0;
  let skipped = 0;

  for (let i = 0; i < types.length; i++) {
    const rt = types[i];
    const existingRaw = Array.isArray(rt?.images) ? rt.images.filter(Boolean) : [];
    if (!force && existingRaw.length >= 3) {
      skipped++;
      continue;
    }
    const existing = force ? [] : existingRaw;
    const seedPrefix = String(rt?.code || rt?.name || rt?._id || `roomtype-${i}`)
      .trim()
      .toLowerCase()
      .replace(/\s+/g, "-")
      .slice(0, 40);
    const nextImages = pickGallery(seedPrefix).slice(0, 6);
    const base = force ? [] : rt?.image ? [rt.image] : [];
    const merged = Array.from(new Set([...base, ...existing, ...nextImages]));
    const finalImages = force ? nextImages : merged.slice(0, 6);

    await RoomType.updateOne(
      { _id: rt._id },
      { $set: { images: finalImages, image: (force ? "" : rt.image) || finalImages[0] } },
    );
    updated++;
  }

  console.log(
    JSON.stringify(
      { ok: true, mongo: MONGO_URI, total_room_types: types.length, updated, skipped },
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

