import Rooms from "../models/rooms.js";
import Booking from "../models/Booking.js";
import { parseStayDates } from "../utils/bookingAvailability.js";
import { BOOKING_SCHEDULE_BLOCKING_STATUSES } from "../utils/bookingSchedule.js";
/**
 * GET /api/rooms/featured — trang chủ: mỗi loại (`room_type`) một phòng đại diện, lấy trực tiếp từ MongoDB.
 * Gom theo `room_type`, chọn bản ghi có `room_no` nhỏ nhất (ổn định, khớp layout A101 → E501).
 * Tối đa 5 loại (đủ cho dataset 5 room_type).
 */
export async function getFeaturedRoomsForHome(req, res) {
  try {
    const limit = Math.min(
      Math.max(Number(req.query.limit) || 5, 1),
      20,
    );
    const pipeline = [
      {
        $match: {
          room_type: { $exists: true, $type: "string", $ne: "" },
        },
      },
      { $sort: { room_no: 1 } },
      {
        $group: {
          _id: "$room_type",
          doc: { $first: "$$ROOT" },
        },
      },
      { $replaceRoot: { newRoot: "$doc" } },
      { $sort: { room_no: 1 } },
      { $limit: limit },
    ];
    const featured = await Rooms.aggregate(pipeline);
    return res.status(200).json(featured);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}

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
    const candidateIdStrSet = new Set(candidateRoomIds.map((id) => String(id)));

    const busyBookings = await Booking.find({
      status: { $in: BOOKING_SCHEDULE_BLOCKING_STATUSES },
      check_in_date: { $lt: end },
      check_out_date: { $gt: start },
      $or: [
        { room_id: { $in: candidateRoomIds } },
        { assigned_room_id: { $in: candidateRoomIds } },
        { assigned_room_ids: { $in: candidateRoomIds } },
      ],
    })
      .select("room_id assigned_room_id")
      .lean();

    const busyRoomIdSet = new Set();
    for (const b of busyBookings) {
      const rid = b.room_id != null ? String(b.room_id) : null;
      const aid = b.assigned_room_id != null ? String(b.assigned_room_id) : null;
      if (rid && candidateIdStrSet.has(rid)) busyRoomIdSet.add(rid);
      if (aid && candidateIdStrSet.has(aid)) busyRoomIdSet.add(aid);
      for (const x of b.assigned_room_ids || []) {
        const sid = x != null ? String(x) : null;
        if (sid && candidateIdStrSet.has(sid)) busyRoomIdSet.add(sid);
      }
    }
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
