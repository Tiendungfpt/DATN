import { Router } from "express";
import {
    addHotel,
    getAllHotel,
    getHotelById,
    deleteHotel,
    updateHotel,
} from "../controllers/hotel";
// import { checkAuth } from "../middlewares/checkAuth";

const hotelRouter = Router();

// hotelRouter.use(checkAuth);

// GET /api/hotels - Lấy danh sách bài viết
hotelRouter.get("/", getAllHotel);

// GET /api/hotels/:id - Lấy chi tiết bài viết
hotelRouter.get("/:id", getHotelById);

// HOTEL /api/hotels - Thêm bài viết mới
hotelRouter.post("/", addHotel);

// // DELETE /api/hotels/:id - Xóa bài viết
hotelRouter.delete("/:id", deleteHotel);

// PUT /api/hotels/:id - Cập nhật bài viết
hotelRouter.put("/:id", updateHotel);

export default hotelRouter;
