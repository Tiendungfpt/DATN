import "./config/mongooseInit.js";
import express from "express";
import mongoose from "mongoose";
import cors from "cors";

import postRouter from "./routers/post";
import roomsRouter from "./routers/rooms";
import authRouter from "./routers/auth";
import bookingRouter from "./routers/booking";
import adminRouter from "./routers/admin";
import { registerUser, loginUser } from "./controllers/auth.js";

const app = express();

app.use(cors());
app.use(express.json());

mongoose
  .connect(process.env.MONGO_URI || "mongodb://localhost:27017/thinhphathotel")
  .then(() => console.log("Connected to MongoDB"))
  .catch((err) => console.error("Could not connect to MongoDB:", err));

/** Alias theo spec: POST /api/register, POST /api/login */
app.post("/api/register", registerUser);
app.post("/api/login", loginUser);

app.use("/api/posts", postRouter);
app.use("/api/auth", authRouter);
app.use("/api/rooms", roomsRouter);
app.use("/api/bookings", bookingRouter);
app.use("/api/admin", adminRouter);

app.use("/uploads", express.static("uploads"));

app.listen(3000, () => {
  console.log("Server is running at http://localhost:3000");
});
