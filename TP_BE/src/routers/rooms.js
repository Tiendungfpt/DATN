import { Router } from "express";
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

// GET /api/rooms - lấy tất cả phòng
roomsRouter.get("/", getAllRooms);

// tìm phòng theo khách sạn
roomsRouter.get("/hotel/:hotelId", getRoomsByHotel);

// tìm kiếm phòng (hotel + giá)
roomsRouter.get("/search", searchRooms);

// GET /api/rooms/:id - lấy phòng theo id
roomsRouter.get("/:id", getRoomsById);

// POST /api/rooms - thêm phòng
roomsRouter.post("/", addRooms);

// DELETE /api/rooms/:id - xóa phòng
roomsRouter.delete("/:id", deleteRooms);

// PUT /api/rooms/:id - cập nhật phòng
roomsRouter.put("/:id", updateRooms);

export default roomsRouter;