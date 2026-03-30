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

roomsRouter.get("/", getAllRooms);

roomsRouter.get("/hotel/:hotelId", getRoomsByHotel);

roomsRouter.get("/search", searchRooms);

roomsRouter.get("/:id", getRoomsById);

roomsRouter.post("/", upload.single("image"), addRooms);

roomsRouter.delete("/:id", deleteRooms);

roomsRouter.put("/:id", upload.single("image"), updateRooms);

export default roomsRouter;