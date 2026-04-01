import Rooms from "../models/rooms.js";
import Booking from "../models/Booking.js";
import { parseStayDates } from "../utils/bookingAvailability.js";

// GET /api/rooms - danh sách phòng
export async function getAllRooms(req, res) {
  try {
    const rooms = await Rooms.find().sort({ createdAt: -1 });
    return res.status(200).json(rooms);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}

// GET /api/rooms/search?check_in_date=YYYY-MM-DD&check_out_date=YYYY-MM-DD&capacity=2
export async function searchRooms(req, res) {
  try {
    const { check_in_date, check_out_date, capacity } = req.query;
    const requestedCapacity = Number(capacity || 1);

    if (!check_in_date || !check_out_date) {
      return res
        .status(400)
        .json({ message: "Thiếu check_in_date hoặc check_out_date" });
    }
    if (!Number.isFinite(requestedCapacity) || requestedCapacity < 1) {
      return res.status(400).json({ message: "capacity không hợp lệ" });
    }

    const parsed = parseStayDates(check_in_date, check_out_date);
    if (parsed.error) {
      return res.status(400).json({ message: parsed.error });
    }
    const { start, end } = parsed;

    const capacityFilter = {
      $or: [{ capacity: { $gte: requestedCapacity } }, { maxGuests: { $gte: requestedCapacity } }],
    };

    const candidateRooms = await Rooms.find(capacityFilter).lean();
    if (!candidateRooms.length) {
      return res.status(200).json([]);
    }

    const candidateRoomIds = candidateRooms.map((r) => r._id);

    const busyBookings = await Booking.find({
      room_id: { $in: candidateRoomIds },
      status: { $in: ["pending", "confirmed"] },
      check_in_date: { $lt: end },
      check_out_date: { $gt: start },
    })
      .select("room_id")
      .lean();

    const busyRoomIdSet = new Set(busyBookings.map((b) => String(b.room_id)));
    const availableRooms = candidateRooms.filter(
      (room) => !busyRoomIdSet.has(String(room._id)),
    );

    return res.status(200).json(availableRooms);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}

// GET /api/rooms/:id - chi tiết phòng
export async function getRoomsById(req, res) {
  try {
    const room = await Rooms.findById(req.params.id);

    if (!room) {
      return res.status(404).json({ error: "Không tìm thấy phòng" });
    }

    return res.status(200).json(room);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}

// POST /api/rooms - thêm phòng
export async function addRooms(req, res) {
  try {
    const newRoom = await Rooms.create({
      ...req.body,
      image: req.file ? req.file.filename : req.body.image || "",
    });

    return res.status(201).json(newRoom);
  } catch (error) {
    return res.status(400).json({ message: error.message });
  }
}

// PUT /api/rooms/:id - cập nhật phòng
export async function updateRooms(req, res) {
  try {
    const updateData = {
      ...req.body,
    };

    if (req.file) {
      updateData.image = req.file.filename;
    }

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

// DELETE /api/rooms/:id - xóa phòng
export async function deleteRooms(req, res) {
  try {
    const room = await Rooms.findByIdAndDelete(req.params.id);

    if (!room) {
      return res.status(404).json({ error: "Không tìm thấy phòng" });
    }

    return res.status(200).json({
      message: "Xóa phòng thành công",
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
