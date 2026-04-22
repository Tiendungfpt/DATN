import { Router } from "express";
import upload from "../middlewares/upload.js";
import { checkAuth } from "../middlewares/checkAuth.js";
import { checkAdmin } from "../middlewares/checkAdmin.js";
import {
  listRoomTypes,
  getRoomTypeById,
  getRoomTypeAvailability,
  createRoomType,
  updateRoomType,
  deleteRoomType,
  uploadRoomTypeImage,
} from "../controllers/roomTypeController.js";

const r = Router();
r.get("/", listRoomTypes);
r.get("/availability", getRoomTypeAvailability);
r.get("/:id", getRoomTypeById);
r.post(
  "/upload-image",
  checkAuth,
  checkAdmin,
  upload.single("image"),
  uploadRoomTypeImage,
);
r.post("/", checkAuth, checkAdmin, createRoomType);
r.put("/:id", checkAuth, checkAdmin, updateRoomType);
r.delete("/:id", checkAuth, checkAdmin, deleteRoomType);

export default r;
