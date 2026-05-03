import dotenv from "dotenv";
import mongoose from "mongoose";
import axios from "axios";
import fs from "fs";
import path from "path";
import RoomType from "../models/RoomType.js";

dotenv.config();

const MONGO_URI =
  process.env.MONGO_URI ||
  process.env.MONGODB_URI ||
  "mongodb://127.0.0.1:27017/thinhphathotel";

const UPLOADS_DIR = path.resolve(process.cwd(), "uploads");

function picsum(seed) {
  return `https://picsum.photos/seed/${encodeURIComponent(seed)}/1600/1000`;
}

function safeSeed(value, fallback) {
  return String(value || fallback)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
}

async function downloadToUploads(url, filename) {
  const full = path.join(UPLOADS_DIR, filename);
  if (fs.existsSync(full)) return filename;

  const resp = await axios.get(url, { responseType: "arraybuffer", timeout: 20000 });
  fs.writeFileSync(full, Buffer.from(resp.data));
  return filename;
}

async function main() {
  if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });
  await mongoose.connect(MONGO_URI, { serverSelectionTimeoutMS: 8000 });

  const types = await RoomType.find().sort({ createdAt: 1 });
  let updated = 0;
  let downloaded = 0;

  for (let i = 0; i < types.length; i++) {
    const rt = types[i];
    const seed = safeSeed(rt.code || rt.name, `roomtype-${rt._id}`);
    const urls = [1, 2, 3, 4, 5].map((n) => picsum(`${seed}-${n}`));

    const filenames = [];
    for (let j = 0; j < urls.length; j++) {
      const fn = `rt-${seed}-${j + 1}.jpg`;
      await downloadToUploads(urls[j], fn);
      downloaded++;
      filenames.push(fn);
    }

    rt.image = filenames[0];
    rt.images = filenames;
    await rt.save();
    updated++;
  }

  console.log(
    JSON.stringify(
      { ok: true, mongo: MONGO_URI, uploads_dir: UPLOADS_DIR, room_types: types.length, updated, downloaded },
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

