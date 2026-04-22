import "./config/mongooseInit.js";
import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import dotenv from "dotenv";

dotenv.config();

import postRouter from "./routers/post.js";
import roomsRouter from "./routers/rooms.js";
import authRouter from "./routers/auth.js";
import hotelRouter from "./routers/hotel.js";
import bookingRouter from "./routers/booking.js";
import hotelBusinessFlowRouter from "./routers/hotelBusinessFlow.js";
import roomTypesRouter from "./routers/roomTypes.js";
import servicesCatalogRouter from "./routers/servicesCatalog.js";
import serviceCategoriesRouter from "./routers/serviceCategories.js";
import reviewRouter from "./routers/review.js";
import adminRouter from "./routers/admin.js";
import momoRouter from "./routers/momoRoutes.js";
import userRoutes from "./routers/user.js";
import dashboardRoutes from "./routers/dashboard.route.js";

const app = express();


app.use(cors());
app.use(express.json());

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

    // Routes
    app.use("/api/hotels", hotelRouter);
    app.use("/api/posts", postRouter);
    app.use("/api/auth", authRouter);
    app.use("/api/rooms", roomsRouter);
    app.use("/api/bookings", bookingRouter);
    app.use("/api", hotelBusinessFlowRouter);
    app.use("/api/room-types", roomTypesRouter);
    app.use("/api/service-categories", serviceCategoriesRouter);
    app.use("/api/services-catalog", servicesCatalogRouter);
    app.use("/api/reviews", reviewRouter);
    app.use("/api/admin", adminRouter);
    app.use("/api/momo", momoRouter);
    app.use("/api/users", userRoutes);
    app.use("/api/dashboard", dashboardRoutes);
    app.use("/uploads", express.static("uploads"));

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
