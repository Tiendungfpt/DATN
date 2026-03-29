import mongoose from "mongoose";
import Rooms from "../models/rooms.js";
import {
  parseStayDates,
  getBusyRoomIds,
} from "../utils/bookingAvailability.js";
import {
  effectiveMaxGuests,
  roomMatchesType,
} from "../utils/roomSearch.js";

function applyGuestAndTypeFilters(rooms, query) {
  const { adults, children, roomType } = query;
  let list = rooms;
  const adultsN = Math.max(0, parseInt(String(adults ?? ""), 10) || 0);
  const childrenN = Math.max(0, parseInt(String(children ?? ""), 10) || 0);
  const hasGuestParams =
    adults !== undefined || children !== undefined;

  if (hasGuestParams) {
    const totalGuests = Math.max(1, adultsN + childrenN);
    list = list.filter((r) => effectiveMaxGuests(r) >= totalGuests);
  }
  const typeFilter = roomType && String(roomType).trim();
  if (typeFilter) {
    list = list.filter((r) => roomMatchesType(r.name, typeFilter));
  }
  return list;
}

/** Query: checkIn + checkOut hoặc checkInDate + checkOutDate; adults, children; roomType */
export async function getAvailableRooms(req, res) {
  try {
    const checkIn =
      req.query.checkInDate ||
      req.query.checkIn ||
      req.query.checkin;
    const checkOut =
      req.query.checkOutDate ||
      req.query.checkOut ||
      req.query.checkout;

    let rooms = await Rooms.find({ status: "available" }).lean();
    rooms = applyGuestAndTypeFilters(rooms, req.query);

    if (checkIn && checkOut) {
      const parsed = parseStayDates(checkIn, checkOut);
      if (parsed.error) {
        return res.status(400).json({ message: parsed.error });
      }
      const { start, end } = parsed;
      const ids = rooms.map((r) => r._id);
      const busy = await getBusyRoomIds(ids, start, end);
      rooms = rooms.filter((r) => !busy.has(String(r._id)));
    }

    return res.json(rooms);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
}

export async function getAllRooms(req, res) {
  try {
    const rooms = await Rooms.find().lean();
    return res.status(200).json(rooms);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}

export async function searchRooms(req, res) {
  try {
    const { minPrice, maxPrice, capacity, sort } = req.query;
    const query = {};

    if (minPrice || maxPrice) {
      query.price = {};
      if (minPrice) query.price.$gte = Number(minPrice);
      if (maxPrice) query.price.$lte = Number(maxPrice);
    }
    if (capacity) query.capacity = capacity;

    const sortOption = {};
    if (sort === "asc") sortOption.price = 1;
    if (sort === "desc") sortOption.price = -1;

    const rooms = await Rooms.find(query).sort(sortOption).lean();
    return res.status(200).json({
      message: "Search rooms successfully",
      total: rooms.length,
      data: rooms,
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
}

export async function getRoomsById(req, res) {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ error: "Id không hợp lệ" });
    }
    const room = await Rooms.findById(req.params.id).lean();
    if (!room) {
      return res.status(404).json({ error: "Không tìm thấy phòng" });
    }
    return res.status(200).json(room);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}

export async function addRooms(req, res) {
  try {
    const body = { ...req.body };
    if (body.maxGuests != null) body.maxGuests = Number(body.maxGuests);
    if (body.price != null) body.price = Number(body.price);

    const newRoom = await Rooms.create({
      ...body,
      image: req.file ? req.file.filename : body.image || "",
    });
    return res.status(201).json(newRoom);
  } catch (error) {
    return res.status(400).json({ message: error.message });
  }
}

export async function updateRooms(req, res) {
  try {
    const updateData = { ...req.body };
    if (updateData.maxGuests != null) {
      updateData.maxGuests = Number(updateData.maxGuests);
    }
    if (updateData.price != null) {
      updateData.price = Number(updateData.price);
    }
    if (req.file) updateData.image = req.file.filename;

    const room = await Rooms.findByIdAndUpdate(req.params.id, updateData, {
      new: true,
    });
    if (!room) {
      return res.status(404).json({ error: "Không tìm thấy phòng" });
    }
    return res.status(200).json(room);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}

export async function deleteRooms(req, res) {
  try {
    const room = await Rooms.findByIdAndDelete(req.params.id);
    if (!room) {
      return res.status(404).json({ error: "Không tìm thấy phòng" });
    }
    return res.status(200).json({ message: "Xóa phòng thành công" });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
