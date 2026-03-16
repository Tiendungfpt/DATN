import express from "express";
import mongoose from "mongoose";
import postRouter from "./routers/post.js";
import roomsRouter from "./routers/rooms.js";
// import authorRouter from "./routers/author.js";

import authRouter from "./routers/auth.js";
import hotelRouter from "./routers/hotel.js";
import bookingRouter from "./routers/booking.js";

const app = express();

app.use(express.json());

mongoose
  .connect("mongodb://localhost:27017/thinhphathotel")
  .then(() => console.log("Connected to MongoDB"))
  .catch((err) => console.error("Could not connect to MongoDB:", err));

app.use("/api/posts", postRouter);
app.use("/api/hotels", hotelRouter);
// app.use("/api/authors", authorRouter);

app.use("/api/auth", authRouter);
app.use("/api/rooms", roomsRouter);
app.use("/api/bookings", bookingRouter);

app.listen(3000, () => {
  console.log(`Server is running on port http://localhost:3000`);
});