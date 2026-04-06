import mongoose from "mongoose";
import Booking from "../models/Booking.js";
import Rooms from "../models/rooms.js";
import User from "../models/User.js";
import { parseStayDates } from "../utils/bookingAvailability.js";
import {
  BOOKING_SCHEDULE_BLOCKING_STATUSES,
  ROOM_OCCUPYING_BOOKING_STATUSES,
} from "../utils/bookingSchedule.js";

function nightsBetween(start, end) {
  const ms = end.getTime() - start.getTime();
  return Math.max(1, Math.ceil(ms / (1000 * 60 * 60 * 24)));
}

async function syncRoomStatus(roomId) {
  if (!roomId) return;
  const hasActiveBooking = await Booking.exists({
    assigned_room_id: roomId,
    status: { $in: ROOM_OCCUPYING_BOOKING_STATUSES },
  });

  await Rooms.findByIdAndUpdate(roomId, {
    status: hasActiveBooking ? "booked" : "available",
  });
}

function normalizeRoomTypeName(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]/g, "")
    .toLowerCase();
}

function getRoomTypeKey(room) {
  if (room?.room_type) {
    return normalizeRoomTypeName(room.room_type);
  }
  return normalizeRoomTypeName(room?.name);
}

async function getAssignableRoomsForBookingDoc(booking) {
  const roomType = await Rooms.findById(booking.room_id).lean();
  if (!roomType) return { roomType: null, assignableRooms: [], sameTypeRooms: [] };

  const roomTypeKey = getRoomTypeKey(roomType);
  const allRooms = await Rooms.find().lean();
  const sameTypeRooms = allRooms.filter((r) => getRoomTypeKey(r) === roomTypeKey);
  const sameTypeRoomIds = sameTypeRooms.map((r) => r._id);

  const busyConfirmed = await Booking.find({
    assigned_room_id: { $in: sameTypeRoomIds },
    status: { $in: ROOM_OCCUPYING_BOOKING_STATUSES },
    check_in_date: { $lt: booking.check_out_date },
    check_out_date: { $gt: booking.check_in_date },
    _id: { $ne: booking._id },
  })
    .select("assigned_room_id")
    .lean();

  const busySet = new Set(
    busyConfirmed.map((b) => String(b.assigned_room_id)).filter(Boolean),
  );
  const assignableRooms = sameTypeRooms.filter(
    (r) => !busySet.has(String(r._id)) || String(r._id) === String(booking.assigned_room_id),
  );

  return { roomType, assignableRooms, sameTypeRooms };
}

export const createBooking = async (req, res) => {
  try {
    const userId = req.userId;
    const {
      room_id,
      check_in_date,
      check_out_date,
      room_quantity,
      services = [],
      service_fee = 0,
    } = req.body;

    const currentUser = await User.findById(userId).select("role").lean();
    if (!currentUser) {
      return res.status(401).json({ message: "Không tìm thấy người dùng" });
    }
    if (currentUser.role === "admin") {
      return res.status(403).json({
        message: "Tài khoản admin không được phép đặt phòng",
      });
    }

    if (!mongoose.isValidObjectId(room_id)) {
      return res.status(400).json({ message: "room_id không hợp lệ" });
    }

    const parsed = parseStayDates(check_in_date, check_out_date);
    if (parsed.error) {
      return res.status(400).json({ message: parsed.error });
    }
    const { start, end } = parsed;

    const room = await Rooms.findById(room_id);
    if (!room) {
      return res.status(404).json({ message: "Không tìm thấy phòng" });
    }

    const quantity = Number.parseInt(room_quantity, 10) || 1;
    if (!Number.isInteger(quantity) || quantity < 1) {
      return res
        .status(400)
        .json({ message: "Số lượng phòng phải là số nguyên lớn hơn hoặc bằng 1" });
    }

    const roomTypeKey = getRoomTypeKey(room);
    const roomTypeRooms = await Rooms.find().lean();
    const sameTypeRoomIds = roomTypeRooms
      .filter((r) => getRoomTypeKey(r) === roomTypeKey)
      .map((r) => r._id);

    const overlapCount = await Booking.countDocuments({
      room_id: { $in: sameTypeRoomIds },
      status: { $in: BOOKING_SCHEDULE_BLOCKING_STATUSES },
      check_in_date: { $lt: end },
      check_out_date: { $gt: start },
    });
    if (overlapCount >= sameTypeRoomIds.length) {
      return res.status(409).json({
        message:
          "Không còn đủ phòng trống thuộc loại phòng này, vui lòng chọn phòng khác",
      });
    }
    const availableCount = sameTypeRoomIds.length - overlapCount;
    if (quantity > availableCount) {
      return res.status(409).json({
        message:
          "Không còn đủ phòng trống thuộc loại phòng này, vui lòng chọn phòng khác",
      });
    }

    const roomOnlyPrice = nightsBetween(start, end) * room.price * quantity;
    const normalizedServiceFee = Math.max(0, Number(service_fee) || 0);
    const totalPrice = roomOnlyPrice + normalizedServiceFee;
    const normalizedServices = Array.isArray(services)
      ? services.filter((item) => typeof item === "string")
      : [];

    const booking = await Booking.create({
      user_id: userId,
      room_id,
      check_in_date: start,
      check_out_date: end,
      room_quantity: quantity,
      services: normalizedServices,
      service_fee: normalizedServiceFee,
      total_price: totalPrice,
      status: "pending",
    });

    const populated = await Booking.findById(booking._id)
      .populate("room_id", "name image price capacity status room_no")
      .populate("assigned_room_id", "name image price capacity status room_no")
      .lean();

    return res.status(201).json({
      message: "Đặt phòng thành công",
      booking: populated,
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

function attachCanReview(booking) {
  const isCanReview = booking.status === "completed" && !booking.isReviewed;
  return { ...booking, isCanReview };
}

/** GET /api/bookings/user */
export const getMyBookings = async (req, res) => {
  try {
    const bookings = await Booking.find({ user_id: req.userId })
      .populate("room_id", "name image price capacity room_no")
      .populate("assigned_room_id", "name image price capacity room_no")
      .sort({ createdAt: -1 })
      .lean();

    return res.json(bookings.map((b) => attachCanReview(b)));
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

/** GET /api/bookings — admin */
export const getAllBookingsAdmin = async (req, res) => {
  try {
    const bookings = await Booking.find()
      .populate("user_id", "name email")
      .populate("room_id", "name image price capacity room_no")
      .populate("assigned_room_id", "name image price capacity room_no")
      .sort({ createdAt: -1 })
      .lean();

    return res.json(bookings.map((b) => attachCanReview(b)));
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

export const getBookingById = async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id)
      .populate("user_id", "name email")
      .populate("room_id", "name image price capacity status room_no")
      .populate("assigned_room_id", "name image price capacity status room_no")
      .lean();

    if (!booking) {
      return res.status(404).json({ message: "Không tìm thấy booking" });
    }

    const ownerId = booking.user_id?._id ?? booking.user_id;
    const isOwner = String(ownerId) === String(req.userId);
    if (!isOwner) {
      const User = (await import("../models/User.js")).default;
      const u = await User.findById(req.userId);
      if (!u || u.role !== "admin") {
        return res.status(403).json({ message: "Không có quyền xem booking này" });
      }
    }

    return res.json(attachCanReview(booking));
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

export const checkInBooking = async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id);
    if (!booking) {
      return res.status(404).json({ message: "Không tìm thấy booking" });
    }
    if (booking.status !== "confirmed") {
      return res.status(400).json({
        message: "Chỉ có thể check-in khi booking đã được xác nhận (confirmed)",
      });
    }
    if (!booking.assigned_room_id) {
      return res.status(400).json({
        message: "Booking chưa có phòng cụ thể, không thể check-in",
      });
    }
    booking.status = "checked_in";
    await booking.save();
    await syncRoomStatus(booking.assigned_room_id);

    const populated = await Booking.findById(booking._id)
      .populate("user_id", "name email")
      .populate("room_id", "name image price capacity status room_no")
      .populate("assigned_room_id", "name image price capacity status room_no")
      .lean();

    return res.json({
      message: "Check-in thành công",
      booking: populated,
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

export const checkOutBooking = async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id);
    if (!booking) {
      return res.status(404).json({ message: "Không tìm thấy booking" });
    }
    if (booking.status !== "checked_in") {
      return res.status(400).json({
        message: "Chỉ có thể check-out khi khách đang ở (checked_in)",
      });
    }
    const assignedId = booking.assigned_room_id;
    // completed: không còn chiếm lịch; phòng vật lý có thể đặt lại (syncRoomStatus).
    booking.status = "completed";
    await booking.save();
    if (assignedId) await syncRoomStatus(assignedId);

    const populated = await Booking.findById(booking._id)
      .populate("user_id", "name email")
      .populate("room_id", "name image price capacity status room_no")
      .populate("assigned_room_id", "name image price capacity status room_no")
      .lean();

    return res.json({
      message: "Check-out thành công — booking đã hoàn tất (completed)",
      booking: attachCanReview(populated),
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

export const updateBooking = async (req, res) => {
  try {
    const allowedStatus = ["pending", "confirmed", "cancelled"];
    if (req.body?.status && !allowedStatus.includes(req.body.status)) {
      return res.status(400).json({ message: "Trạng thái booking không hợp lệ" });
    }

    const booking = await Booking.findById(req.params.id);
    if (!booking) {
      return res.status(404).json({ message: "Không tìm thấy" });
    }

    if (booking.status === "completed") {
      return res.status(400).json({
        message: "Booking đã hoàn tất (completed), không thể cập nhật qua API này",
      });
    }

    const nextStatus = req.body?.status || booking.status;

    if (nextStatus === "confirmed") {
      if (!["pending", "confirmed"].includes(booking.status)) {
        return res.status(400).json({
          message:
            "Chỉ có thể xác nhận (confirmed) khi booking đang pending hoặc đã confirmed",
        });
      }
      const selectedAssignedRoomId =
        req.body?.assigned_room_id || booking.assigned_room_id;
      if (!selectedAssignedRoomId || !mongoose.isValidObjectId(selectedAssignedRoomId)) {
        return res.status(400).json({
          message: "Vui lòng chọn phòng cụ thể hợp lệ trước khi xác nhận",
        });
      }

      const prevAssigned = booking.assigned_room_id;
      const { roomType, assignableRooms } = await getAssignableRoomsForBookingDoc(booking);
      if (!roomType) {
        return res.status(404).json({ message: "Không tìm thấy loại phòng đã đặt" });
      }

      const isAllowed = assignableRooms.some(
        (r) => String(r._id) === String(selectedAssignedRoomId),
      );
      if (!isAllowed) {
        return res.status(409).json({
          message: "Phòng được chọn không khả dụng trong khoảng thời gian này",
        });
      }

      booking.assigned_room_id = selectedAssignedRoomId;
      booking.status = "confirmed";
      await booking.save();
      if (prevAssigned && String(prevAssigned) !== String(selectedAssignedRoomId)) {
        await syncRoomStatus(prevAssigned);
      }
      await syncRoomStatus(selectedAssignedRoomId);
    } else if (nextStatus === "cancelled") {
      const prevAssigned = booking.assigned_room_id;
      booking.status = "cancelled";
      booking.assigned_room_id = null;
      await booking.save();
      await syncRoomStatus(prevAssigned);
    } else {
      booking.status = nextStatus;
      await booking.save();
    }

    const populated = await Booking.findById(booking._id)
      .populate("user_id", "name email")
      .populate("room_id", "name image price capacity status room_no")
      .populate("assigned_room_id", "name image price capacity status room_no")
      .lean();

    return res.json({
      message: "Cập nhật booking thành công",
      booking: attachCanReview(populated),
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

export const getAssignableRooms = async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id).lean();
    if (!booking) {
      return res.status(404).json({ message: "Không tìm thấy booking" });
    }
    const { roomType, assignableRooms } = await getAssignableRoomsForBookingDoc(booking);
    if (!roomType) {
      return res.status(404).json({ message: "Không tìm thấy loại phòng đã đặt" });
    }

    return res.json({
      booking_id: booking._id,
      room_type: roomType.room_type || roomType.name,
      rooms: assignableRooms.map((r) => ({
        _id: r._id,
        name: r.name,
        room_no: r.room_no || "",
        status: r.status,
        price: r.price,
        capacity: r.capacity,
      })),
    });
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
    if (String(booking.user_id) !== String(req.userId)) {
      return res.status(403).json({ message: "Không có quyền" });
    }
    if (booking.status === "checked_in" || booking.status === "completed") {
      return res.status(400).json({
        message: "Không thể hủy booking khi đã check-in hoặc đã hoàn tất",
      });
    }
    booking.status = "cancelled";
    const prevAssigned = booking.assigned_room_id;
    booking.assigned_room_id = null;
    await booking.save();
    await syncRoomStatus(prevAssigned);
    return res.json({ message: "Hủy đặt phòng thành công", booking });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

export const deleteBooking = async (req, res) => {
  try {
    const deleted = await Booking.findByIdAndDelete(req.params.id);
    if (deleted?.assigned_room_id) {
      await syncRoomStatus(deleted.assigned_room_id);
    }
    return res.json({ message: "Xóa booking thành công" });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

export const paymentBooking = async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id).populate(
      "room_id",
      "name image price capacity status room_no"
    );
    if (!booking) {
      return res.status(404).json({ message: "Không tìm thấy booking" });
    }
    // Thanh toán không tự xác nhận, admin sẽ confirm thủ công.
    if (booking.status === "cancelled") {
      return res.status(400).json({ message: "Booking đã hủy, không thể thanh toán" });
    }
    if (booking.status !== "pending") {
      if (booking.status === "confirmed" || booking.status === "checked_in" || booking.status === "completed") {
        return res.status(400).json({
          message: "Booking không còn ở trạng thái chờ thanh toán",
        });
      }
      booking.status = "pending";
      await booking.save();
    }
    return res.json({
      message: "Thanh toán thành công, booking đang chờ admin xác nhận",
      booking,
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};
