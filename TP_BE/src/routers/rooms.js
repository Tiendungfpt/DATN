import { Router } from "express";
import upload from "../middlewares/upload.js";

import {
  addRooms,
  getAllRooms,
  getRoomsById,
  deleteRooms,
  updateRooms,
  getAvailableRooms,
  searchRooms,
} from "../controllers/rooms.js";

const roomsRouter = Router();

roomsRouter.get("/", getAllRooms);
roomsRouter.get("/available", getAvailableRooms);
roomsRouter.get("/search", searchRooms);
roomsRouter.get("/:id", getRoomsById);

roomsRouter.post("/", upload.single("image"), addRooms);
roomsRouter.delete("/:id", deleteRooms);
roomsRouter.put("/:id", upload.single("image"), updateRooms);

export default roomsRouter;
