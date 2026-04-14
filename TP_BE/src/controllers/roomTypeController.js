import RoomType from "../models/RoomType.js";
import Room from "../models/rooms.js";
import Booking from "../models/Booking.js";

const ALLOWED = ["name", "price", "description", "maxGuests", "image", "code"];

function pickRoomTypeBody(body) {
  const o = {};
  for (const k of ALLOWED) {
    if (body[k] === undefined || body[k] === null) continue;
    if (k === "name") o.name = String(body.name).trim();
    else if (k === "code")
      o.code = String(body.code)
        .trim()
        .toLowerCase()
        .replace(/\s+/g, "_");
    else if (k === "description") o.description = String(body.description);
    else if (k === "image") o.image = String(body.image).trim();
    else if (k === "price") o.price = Number(body.price);
    else if (k === "maxGuests")
      o.maxGuests = Math.max(1, Number.parseInt(String(body.maxGuests), 10) || 1);
  }
  return o;
}

/** POST multipart — trả về filename lưu trong uploads/ */
export const uploadRoomTypeImage = (req, res) => {
  if (!req.file?.filename) {
    return res.status(400).json({ message: "Thieu file anh" });
  }
  res.json({ filename: req.file.filename });
};

/** Public list for booking UI */
export const listRoomTypes = async (req, res) => {
  try {
    const items = await RoomType.find().sort({ name: 1 }).lean();
    res.json(items);
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
};

export const createRoomType = async (req, res) => {
  try {
    const data = pickRoomTypeBody(req.body);
    if (!data.name) {
      return res.status(400).json({ message: "Thiếu tên loại phòng" });
    }
    if (data.price === undefined || Number.isNaN(data.price) || data.price < 0) {
      return res.status(400).json({ message: "Gia khong hop le" });
    }
    const doc = await RoomType.create({
      code: data.code ?? "",
      name: data.name,
      price: data.price,
      description: data.description ?? "",
      maxGuests: data.maxGuests ?? 2,
      image: data.image ?? "",
    });
    res.status(201).json(doc);
  } catch (e) {
    res.status(400).json({ message: e.message });
  }
};

export const updateRoomType = async (req, res) => {
  try {
    const data = pickRoomTypeBody(req.body);
    if (Object.keys(data).length === 0) {
      return res.status(400).json({ message: "Khong co truong hop le de cap nhat" });
    }
    const doc = await RoomType.findByIdAndUpdate(req.params.id, data, {
      new: true,
      runValidators: true,
    });
    if (!doc) return res.status(404).json({ message: "Not found" });
    res.json(doc);
  } catch (e) {
    res.status(400).json({ message: e.message });
  }
};

export const deleteRoomType = async (req, res) => {
  try {
    const id = req.params.id;
    const [roomCount, bookingCount] = await Promise.all([
      Room.countDocuments({ roomType: id }),
      Booking.countDocuments({ room_type_id: id }),
    ]);
    if (roomCount > 0 || bookingCount > 0) {
      return res.status(400).json({
        message: `Không xóa được loại phòng: đang có ${roomCount} phòng vật lý và ${bookingCount} booking g\u1eafn lo\u1ea1i n\u00e0y.`,
      });
    }
    const deleted = await RoomType.findByIdAndDelete(id);
    if (!deleted) return res.status(404).json({ message: "Không tìm thấy loại phòng" });
    res.json({ message: "Đã xóa" });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
};
