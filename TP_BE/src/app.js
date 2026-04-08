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
import reviewRouter from "./routers/review.js";
import adminRouter from "./routers/admin.js";
import momoRouter from "./routers/momoRoutes.js";
import userRoutes from "./routers/user.js";
import dashboardRoutes from "./routers/dashboard.route.js";

const app = express();


app.use(cors());
app.use(express.json());

mongoose
  .connect("mongodb://localhost:27017/thinhphathotel")
  .then(() => console.log("✅ Connected to MongoDB"))
  .catch((err) => console.error("❌ Could not connect to MongoDB:", err));

// Routes
app.use("/api/hotels", hotelRouter);
app.use("/api/posts", postRouter);
app.use("/api/auth", authRouter);
app.use("/api/rooms", roomsRouter);
app.use("/api/bookings", bookingRouter);
app.use("/api/reviews", reviewRouter);
app.use("/api/admin", adminRouter);
app.use("/api/momo", momoRouter);
app.use("/api/users", userRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/uploads", express.static("uploads"));

app.listen(3000, () => {
  console.log("🚀 Server is running at http://localhost:3000");
});
