import mongoose from "mongoose";
import Booking from "../models/Booking.js";
import Rooms from "../models/rooms.js";
import {
  parseStayDates,
  getBusyRoomIds,
} from "../utils/bookingAvailability.js";
import { mapRoomsById } from "../utils/roomLookup.js";

function nightsBetween(start, end) {
  const ms = end.getTime() - start.getTime();
  return Math.max(1, Math.ceil(ms / (1000 * 60 * 60 * 24)));
}

export const createBooking = async (req, res) => {
  try {
    const userId = req.userId;
    const { roomIds, checkInDate, checkOutDate } = req.body;

    if (!Array.isArray(roomIds) || roomIds.length === 0) {
      return res.status(400).json({
        message: "Cần ít nhất một phòng (roomIds là mảng id)",
      });
    }

    const ids = [...new Set(roomIds.map((id) => String(id).trim()))];
    for (const id of ids) {
      if (!mongoose.isValidObjectId(id)) {
        return res.status(400).json({ message: `roomId không hợp lệ: ${id}` });
      }
    }

    const parsed = parseStayDates(checkInDate, checkOutDate);
    if (parsed.error) {
      return res.status(400).json({ message: parsed.error });
    }
    const { start, end } = parsed;

    const roomDocs = await Rooms.find({
      _id: { $in: ids },
      status: "available",
    }).lean();

    if (roomDocs.length !== ids.length) {
      return res.status(400).json({
        message: "Một hoặc nhiều phòng không tồn tại hoặc không khả dụng",
      });
    }

    const busy = await getBusyRoomIds(
      ids.map((id) => new mongoose.Types.ObjectId(id)),
      start,
      end
    );
    const conflict = ids.find((id) => busy.has(String(id)));
    if (conflict) {
      return res.status(409).json({
        message: `Phòng ${conflict} đã có lịch trùng trong khoảng thời gian này`,
      });
    }

    const n = nightsBetween(start, end);
    const totalPrice = roomDocs.reduce((sum, r) => sum + r.price * n, 0);

    const booking = await Booking.create({
      userId,
      rooms: ids,
      checkInDate: start,
      checkOutDate: end,
      totalPrice,
      status: "pending",
    });

    const populated = await Booking.findById(booking._id).lean();
    const roomMap = await mapRoomsById(populated.rooms);
    return res.status(201).json({
      message: "Đặt phòng thành công",
      booking: {
        ...populated,
        roomsDetail: ids.map((id) => roomMap.get(String(id)) || id),
      },
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

/** GET /api/bookings/user */
export const getMyBookings = async (req, res) => {
  try {
    const bookings = await Booking.find({ userId: req.userId })
      .sort({ createdAt: -1 })
      .lean();

    const roomMap = await mapRoomsById(
      bookings.flatMap((b) => b.rooms || [])
    );

    const result = bookings.map((b) => ({
      ...b,
      roomsDetail: (b.rooms || []).map(
        (id) => roomMap.get(String(id)) || id
      ),
    }));

    return res.json(result);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

/** GET /api/bookings — admin */
export const getAllBookingsAdmin = async (req, res) => {
  try {
    const bookings = await Booking.find()
      .populate("userId", "name email")
      .sort({ createdAt: -1 })
      .lean();

    const roomMap = await mapRoomsById(
      bookings.flatMap((b) => b.rooms || [])
    );

    const result = bookings.map((b) => ({
      ...b,
      roomsDetail: (b.rooms || []).map(
        (id) => roomMap.get(String(id)) || id
      ),
    }));

    return res.json(result);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

export const getBookingById = async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id)
      .populate("userId", "name email")
      .lean();

    if (!booking) {
      return res.status(404).json({ message: "Không tìm thấy booking" });
    }

    const ownerId = booking.userId?._id ?? booking.userId;
    const isOwner = String(ownerId) === String(req.userId);
    if (!isOwner) {
      const User = (await import("../models/User.js")).default;
      const u = await User.findById(req.userId);
      if (!u || u.role !== "admin") {
        return res.status(403).json({ message: "Không có quyền xem booking này" });
      }
    }

    const roomMap = await mapRoomsById(booking.rooms || []);
    return res.json({
      ...booking,
      roomsDetail: (booking.rooms || []).map(
        (id) => roomMap.get(String(id)) || id
      ),
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

export const updateBooking = async (req, res) => {
  try {
    const booking = await Booking.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
    });
    if (!booking) {
      return res.status(404).json({ message: "Không tìm thấy" });
    }
    return res.json({ message: "Cập nhật booking thành công", booking });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

export const cancelBooking = async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id);
    if (!booking) {
      return res.status(404).json({ message: "Không tìm thấy booking" });
    }
    if (String(booking.userId) !== String(req.userId)) {
      return res.status(403).json({ message: "Không có quyền" });
    }
    booking.status = "cancelled";
    await booking.save();
    return res.json({ message: "Hủy đặt phòng thành công", booking });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

export const deleteBooking = async (req, res) => {
  try {
    await Booking.findByIdAndDelete(req.params.id);
    return res.json({ message: "Xóa booking thành công" });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

export const paymentBooking = async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id);
    if (!booking) {
      return res.status(404).json({ message: "Không tìm thấy booking" });
    }
    if (booking.paymentStatus === "paid") {
      return res.status(400).json({ message: "Booking đã thanh toán" });
    }
    const { paymentMethod } = req.body;
    booking.paymentMethod = paymentMethod || "cash";
    booking.paymentStatus = "paid";
    booking.transactionId = "PAY_" + Date.now();
    booking.status = "confirmed";
    await booking.save();
    return res.json({ message: "Thanh toán thành công", booking });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};
