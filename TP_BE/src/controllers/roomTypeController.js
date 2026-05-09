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
  "deposit_amount",
  "description",
  "maxGuests",
  "max_guests",
  "image",
  "images",
  "area_sqm",
  "bed_type",
  "code",
  "complimentary_services",
  "extra_services",
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
    else if (k === "complimentary_services" || k === "extra_services") {
      const rawInput = body[k];
      const rawList = Array.isArray(rawInput)
        ? rawInput
        : String(rawInput || "")
            .split(",")
            .map((x) => x.trim())
            .filter(Boolean);
      o[k] = rawList
        .map((x) => String(x || "").trim())
        .filter(Boolean);
    }
    else if (k === "price") o.price = Number(body.price);
    else if (k === "deposit_amount") o.deposit_amount = Number(body.deposit_amount);
    else if (k === "maxGuests" || k === "max_guests") {
      const rawMaxGuests = body.maxGuests ?? body.max_guests;
      o.maxGuests = Math.max(1, Number.parseInt(String(rawMaxGuests), 10) || 1);
    }
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

/** POST multipart nhiều file — trả về danh sách filename trong uploads/ */
export const uploadRoomTypeImages = (req, res) => {
  const files = Array.isArray(req.files) ? req.files : [];
  const filenames = files.map((f) => String(f?.filename || "").trim()).filter(Boolean);
  if (!filenames.length) {
    return res.status(400).json({ message: "Thieu file anh" });
  }
  return res.json({ filenames });
};

/** Public list for booking UI */
export const listRoomTypes = async (req, res) => {
  try {
    const itemsRaw = await RoomType.find()
      .populate("complimentary_services", "name defaultPrice unit isActive")
      .populate("extra_services", "name defaultPrice unit isActive")
      .sort({ name: 1 })
      .lean();
    const items = itemsRaw.map((it) => ({ ...it, max_guests: it.maxGuests }));
    res.json(items);
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
};

/** Public detail for room type page */
export const getRoomTypeById = async (req, res) => {
  try {
    const docRaw = await RoomType.findById(req.params.id)
      .populate("complimentary_services", "name defaultPrice unit isActive")
      .populate("extra_services", "name defaultPrice unit isActive")
      .lean();
    const doc = docRaw ? { ...docRaw, max_guests: docRaw.maxGuests } : null;
    if (!doc) return res.status(404).json({ message: "Không tìm thấy loại phòng" });
    return res.json(doc);
  } catch (e) {
    return res.status(400).json({ message: e.message });
  }
};

/** Public availability summary by room type (overnight only). */
export const getRoomTypeAvailability = async (req, res) => {
  try {
    const bookingType = String(req.query.booking_type || "overnight")
      .trim()
      .toLowerCase();
    if (bookingType !== "overnight") {
      return res.status(400).json({ message: "Hệ thống hiện chỉ hỗ trợ đặt theo đêm" });
    }
    let start;
    let end;
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
      data.deposit_amount !== undefined &&
      (Number.isNaN(data.deposit_amount) || data.deposit_amount < 0)
    ) {
      return res.status(400).json({ message: "Tien coc khong hop le" });
    }
    const doc = await RoomType.create({
      code: data.code ?? "",
      name: data.name,
      price: data.price,
      deposit_amount: data.deposit_amount ?? 0,
      description: data.description ?? "",
      maxGuests: data.maxGuests ?? 2,
      image: data.image ?? "",
      images: data.images ?? [],
      area_sqm: data.area_sqm ?? 0,
      bed_type: data.bed_type ?? "",
      complimentary_services: data.complimentary_services ?? [],
      extra_services: data.extra_services ?? [],
    });
    const plain = doc.toObject();
    res.status(201).json({ ...plain, max_guests: plain.maxGuests });
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
    const prev = await RoomType.findById(req.params.id).lean();
    if (!prev) return res.status(404).json({ message: "Not found" });

    const doc = await RoomType.findByIdAndUpdate(req.params.id, data, {
      new: true,
      runValidators: true,
    });

    // Keep physical room data in sync with room type edits to avoid stale frontend display.
    const roomFilter = {
      $or: [
        { roomType: req.params.id },
        { room_type: String(prev?.code || "").trim() },
        { room_type: String(prev?.name || "").trim() },
      ].filter((c) => {
        const v = Object.values(c)[0];
        return v !== "";
      }),
    };
    const roomSet = {};
    if (data.price !== undefined && !Number.isNaN(Number(data.price))) {
      roomSet.price = Number(data.price);
    }
    if (data.maxGuests !== undefined && !Number.isNaN(Number(data.maxGuests))) {
      roomSet.capacity = Math.max(1, Number.parseInt(String(data.maxGuests), 10) || 1);
    }
    if (data.code !== undefined || data.name !== undefined) {
      roomSet.room_type = String(data.code || data.name || doc.code || doc.name || "").trim();
    }
    if (Object.keys(roomSet).length > 0) {
      await Room.updateMany(roomFilter, { $set: roomSet });
    }

    const plain = doc.toObject();
    res.json({ ...plain, max_guests: plain.maxGuests });
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
