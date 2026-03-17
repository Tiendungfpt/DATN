import { Router } from "express";
import upload from "../middlewares/upload.js"; // 🔥 thêm dòng này

import {
  addRooms,
  getAllRooms,
  getRoomsById,
  deleteRooms,
  updateRooms,
  getRoomsByHotel,
  searchRooms
} from "../controllers/rooms.js";

const roomsRouter = Router();

// GET /api/rooms
roomsRouter.get("/", getAllRooms);

// tìm phòng theo khách sạn
roomsRouter.get("/hotel/:hotelId", getRoomsByHotel);

// tìm kiếm phòng
roomsRouter.get("/search", searchRooms);

// GET theo id
roomsRouter.get("/:id", getRoomsById);

// 🔥 POST (THÊM PHÒNG + UPLOAD ẢNH)
roomsRouter.post("/", upload.single("image"), addRooms);

// DELETE
roomsRouter.delete("/:id", deleteRooms);

// 🔥 PUT (UPDATE + UPLOAD ẢNH luôn nếu muốn)
roomsRouter.put("/:id", upload.single("image"), updateRooms);

export default roomsRouter;