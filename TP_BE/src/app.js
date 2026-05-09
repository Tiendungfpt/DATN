import mongoose from "mongoose";
import { createApp } from "./createApp.js";

const MONGO_URI =
  process.env.MONGO_URI ||
  process.env.MONGODB_URI ||
  "mongodb://127.0.0.1:27017/thinhphathotel";

async function start() {
  try {
    await mongoose.connect(MONGO_URI, {
      serverSelectionTimeoutMS: 8000,
    });
    console.log("✅ Connected to MongoDB");

    const app = createApp();

    const port = Number(process.env.PORT || 3000);
    app.listen(port, () => {
      console.log(`🚀 Server is running at http://localhost:${port}`);
    });
  } catch (err) {
    console.error("❌ Could not connect to MongoDB:", err);
    console.error("Mongo URI:", MONGO_URI);
    process.exit(1);
  }
}

start();
