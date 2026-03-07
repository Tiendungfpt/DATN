import { Router } from "express";
import {
    addRooms,
    getAllRooms,
    getRoomsById,
    deleteRooms,
    updateRooms,
} from "../controllers/rooms";
// import { checkAuth } from "../middlewares/checkAuth";

const roomsRouter = Router();

// roomsRouter.use(checkAuth);

// GET /api/roomss - Lấy danh sách bài viết
roomsRouter.get("/", getAllRooms);

// GET /api/roomss/:id - Lấy chi tiết bài viết
roomsRouter.get("/:id", getRoomsById);

// ROOMS /api/roomss - Thêm bài viết mới
roomsRouter.post("/", addRooms);

// // DELETE /api/roomss/:id - Xóa bài viết
roomsRouter.delete("/:id", deleteRooms);

// PUT /api/roomss/:id - Cập nhật bài viết
roomsRouter.put("/:id", updateRooms);

export default roomsRouter;
