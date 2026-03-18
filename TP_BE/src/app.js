import express from "express";
import mongoose from "mongoose";
import cors from "cors";

import postRouter from "./routers/post";
import roomsRouter from "./routers/rooms";
import authRouter from "./routers/auth";
import hotelRouter from "./routers/hotel";
import bookingRouter from "./routers/booking";
import adminRouter from "./routers/admin";

const app = express();

// middleware
app.use(cors());
app.use(express.json());

// connect MongoDB
mongoose
  .connect("mongodb://localhost:27017/thinhphathotel")
  .then(() => console.log("Connected to MongoDB"))
  .catch((err) => console.error("Could not connect to MongoDB:", err));

// routes
app.use("/api/posts", postRouter);
app.use("/api/hotels", hotelRouter);
app.use("/api/auth", authRouter);
app.use("/api/rooms", roomsRouter);
app.use("/api/bookings", bookingRouter);
app.use("/api/admin", adminRouter);

app.use("/uploads", express.static("uploads"));

// start server
app.listen(3000, () => {
  console.log("Server is running at http://localhost:3000");
});