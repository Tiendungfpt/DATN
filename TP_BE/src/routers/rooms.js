import { Router } from "express";
import upload from "../middlewares/upload.js";

import {
  addRooms,
  getAllRooms,
  getRoomsById,
  deleteRooms,
  updateRooms,
  getAvailableRooms,
  getBookingAvailabilityByRoom,
  searchRooms,
} from "../controllers/rooms.js";

const roomsRouter = Router();

roomsRouter.get("/", getAllRooms);
roomsRouter.get("/available", getAvailableRooms);
/** Không dùng /:id một cấp (vd booking-availability) — sẽ trùng route GET /:id */
roomsRouter.get("/availability/book", getBookingAvailabilityByRoom);
roomsRouter.get("/search", searchRooms);
roomsRouter.get("/:id", getRoomsById);

roomsRouter.post("/", upload.single("image"), addRooms);
roomsRouter.delete("/:id", deleteRooms);
roomsRouter.put("/:id", upload.single("image"), updateRooms);

export default roomsRouter;
