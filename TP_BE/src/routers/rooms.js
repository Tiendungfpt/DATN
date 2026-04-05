import { Router } from "express";
import upload from "../middlewares/upload.js"; // 🔥 thêm dòng này

import {
  addRooms,
  getAllRooms,
  getFeaturedRoomsForHome,
  searchRooms,
  getRoomsById,
  deleteRooms,
  updateRooms
} from "../controllers/rooms.js";

const roomsRouter = Router();

roomsRouter.get("/", getAllRooms);
roomsRouter.get("/search", searchRooms);
roomsRouter.get("/featured", getFeaturedRoomsForHome);

roomsRouter.get("/:id", getRoomsById);

roomsRouter.post("/", upload.single("image"), addRooms);

roomsRouter.delete("/:id", deleteRooms);

roomsRouter.put("/:id", upload.single("image"), updateRooms);

export default roomsRouter;