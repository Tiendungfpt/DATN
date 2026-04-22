import RoomType from "../models/RoomType.js";
import Room from "../models/rooms.js";
import Booking from "../models/Booking.js";
import { parseStayDates } from "../utils/bookingAvailability.js";
import {
  countBookablePhysicalRoomsByType,
  sumReservedSlotsForRoomType,
} from "../utils/hotelBooking.js";

const ALLOWED = [
  "name",
  "price",
  "hourly_price",
  "deposit_amount",
  "description",
  "maxGuests",
  "image",
  "images",
  "area_sqm",
  "bed_type",
  "code",
];

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
    else if (k === "images")
      o.images = Array.isArray(body.images)
        ? body.images.map((x) => String(x || "").trim()).filter(Boolean)
        : String(body.images || "")
            .split(",")
            .map((x) => x.trim())
            .filter(Boolean);
    else if (k === "price") o.price = Number(body.price);
    else if (k === "hourly_price") o.hourly_price = Number(body.hourly_price);
    else if (k === "deposit_amount") o.deposit_amount = Number(body.deposit_amount);
    else if (k === "maxGuests")
      o.maxGuests = Math.max(1, Number.parseInt(String(body.maxGuests), 10) || 1);
    else if (k === "area_sqm") o.area_sqm = Math.max(0, Number(body.area_sqm) || 0);
    else if (k === "bed_type") o.bed_type = String(body.bed_type || "").trim();
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

/** Public detail for room type page */
export const getRoomTypeById = async (req, res) => {
  try {
    const doc = await RoomType.findById(req.params.id).lean();
    if (!doc) return res.status(404).json({ message: "Không tìm thấy loại phòng" });
    return res.json(doc);
  } catch (e) {
    return res.status(400).json({ message: e.message });
  }
};

/**
 * Public availability summary by room type.
 * Optional query:
 * - check_in_date, check_out_date (overnight)
 * - booking_type=hourly & stay_hours (+ check_in_date as datetime)
 */
export const getRoomTypeAvailability = async (req, res) => {
  try {
    const bookingType = String(req.query.booking_type || "overnight")
      .trim()
      .toLowerCase();
    let start;
    let end;

    if (bookingType === "hourly") {
      const checkInRaw = String(req.query.check_in_date || "").trim();
      const startAt = checkInRaw ? new Date(checkInRaw) : new Date();
      if (Number.isNaN(startAt.getTime())) {
        return res.status(400).json({ message: "Giờ nhận phòng không hợp lệ" });
      }
      const stayHours = Math.max(
        1,
        Number.parseInt(String(req.query.stay_hours || "1"), 10) || 1,
      );
      start = startAt;
      end = new Date(startAt.getTime() + stayHours * 60 * 60 * 1000);
    } else {
      const checkInRaw = String(req.query.check_in_date || "").trim();
      const checkOutRaw = String(req.query.check_out_date || "").trim();
      if (checkInRaw && checkOutRaw) {
        const parsed = parseStayDates(checkInRaw, checkOutRaw);
        if (parsed.error) return res.status(400).json({ message: parsed.error });
        start = parsed.start;
        end = parsed.end;
      } else {
        const now = new Date();
        start = now;
        end = new Date(now.getTime() + 60 * 60 * 1000);
      }
    }

    const roomTypes = await RoomType.find().sort({ name: 1 }).lean();
    const items = [];
    for (const rt of roomTypes) {
      const roomTypeId = String(rt._id);
      const physical = await countBookablePhysicalRoomsByType(roomTypeId);
      const reserved = await sumReservedSlotsForRoomType(roomTypeId, start, end, null);
      const available = Math.max(0, physical - reserved);
      items.push({
        room_type_id: roomTypeId,
        code: rt.code || "",
        name: rt.name || "",
        physical_total: physical,
        reserved_count: reserved,
        available_count: available,
      });
    }

    return res.json({
      booking_type: bookingType,
      check_in_date: start,
      check_out_date: end,
      items,
    });
  } catch (e) {
    return res.status(500).json({ message: e.message });
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
    if (
      data.hourly_price !== undefined &&
      (Number.isNaN(data.hourly_price) || data.hourly_price < 0)
    ) {
      return res.status(400).json({ message: "Gia theo gio khong hop le" });
    }
    if (
      data.deposit_amount !== undefined &&
      (Number.isNaN(data.deposit_amount) || data.deposit_amount < 0)
    ) {
      return res.status(400).json({ message: "Tien coc khong hop le" });
    }
    const doc = await RoomType.create({
      code: data.code ?? "",
      name: data.name,
      price: data.price,
      hourly_price: data.hourly_price ?? 0,
      deposit_amount: data.deposit_amount ?? 0,
      description: data.description ?? "",
      maxGuests: data.maxGuests ?? 2,
      image: data.image ?? "",
      images: data.images ?? [],
      area_sqm: data.area_sqm ?? 0,
      bed_type: data.bed_type ?? "",
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
