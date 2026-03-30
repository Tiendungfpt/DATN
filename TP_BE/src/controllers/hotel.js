import Hotel from "../models/Hotel";
import Rooms from "../models/rooms.js";

export async function getAllHotel(req, res) {
  try {
    const hotels = await Hotel.find();

    const result = await Promise.all(
      hotels.map(async (hotel) => {
        const count = await Rooms.countDocuments({
          hotelId: hotel._id,
        });

        return {
          ...hotel.toObject(), 
          roomCount: count,
        };
      }),
    );

    return res.json(result);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}

export async function getHotelById(req, res) {
  try {
    const hotel = await Hotel.findById(req.params.id);
    if (!hotel) {
      return res.status(404).json({ error: "Ko tim thay" });
    }
    return res.json(hotel);
  } catch (error) {
    return res.json({ error: error.message });
  }
}

export async function addHotel(req, res) {
  try {
    const newHotel = await Hotel.create({
      ...req.body,
      image: req.file ? req.file.filename : "", 
    });

    return res.status(201).json(newHotel);
  } catch (error) {
    return res.status(400).json({ message: error.message });
  }
}

export async function updateHotel(req, res) {
  try {
    const hotel = await Hotel.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
    });
    if (!hotel) {
      return res.status(404).json({ error: "Ko tim thay" });
    }
    return res.json(hotel);
  } catch (error) {
    return res.json({ error: error.message });
  }
}

export async function deleteHotel(req, res) {
  try {
    const hotel = await Hotel.findByIdAndDelete(req.params.id);
    if (!hotel) {
      return res.status(404).json({ error: "Ko tim thay" });
    }
    return res.json({ success: true });
  } catch (error) {
    return res.json({ error: error.message });
  }
}

export async function getHotelsForHome(req, res) {
  try {
    const hotels = await Hotel.find()
      .select(
        "name address image description rating reviewCount locationNote hotline",
      ) 
      .lean(); 

    const result = await Promise.all(
      hotels.map(async (hotel) => {
        const roomCount = await Rooms.countDocuments({ hotelId: hotel._id });

        const cheapestRoom = await Rooms.findOne({ hotelId: hotel._id })
          .sort({ price: 1 })
          .select("price")
          .lean();

        return {
          ...hotel,
          roomCount,
          cheapestPrice: cheapestRoom ? cheapestRoom.price : null,
          formattedPrice: cheapestRoom
            ? cheapestRoom.price.toLocaleString("vi-VN") + "đ"
            : "Liên hệ",
        };
      }),
    );

    return res.json(result);
  } catch (error) {
    console.error(error);
    return res
      .status(500)
      .json({ error: "Lỗi server khi lấy dữ liệu trang chủ" });
  }
}
