import { Router } from "express";
import {
    addHotel,
    getAllHotel,
    getHotelById,
    deleteHotel,
    updateHotel,
    getHotelsForHome
} from "../controllers/hotel";
import upload from "../middlewares/upload.js";

const hotelRouter = Router();

hotelRouter.get("/", getAllHotel);

hotelRouter.get("/:id", getHotelById);

hotelRouter.post(
    "/",
    upload.single("image"), 
    addHotel
);

hotelRouter.delete("/:id", deleteHotel);

hotelRouter.put("/:id", updateHotel);


export default hotelRouter;
