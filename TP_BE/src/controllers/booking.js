import mongoose from "mongoose";
import PDFDocument from "pdfkit";
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

function formatCurrencyVND(value) {
  return `${Number(value || 0).toLocaleString("vi-VN")} VND`;
}

function formatDateVi(dateValue) {
  if (!dateValue) return "";
  return new Date(dateValue).toLocaleDateString("vi-VN");
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

export const downloadBookingInvoice = async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id)
      .populate("user_id", "name email")
      .populate("room_id", "name price room_no")
      .populate("assigned_room_id", "name room_no")
      .lean();

    if (!booking) {
      return res.status(404).json({ message: "Không tìm thấy booking" });
    }

    const ownerId = booking.user_id?._id ?? booking.user_id;
    const isOwner = String(ownerId) === String(req.userId);
    if (!isOwner) {
      const u = await User.findById(req.userId).select("role").lean();
      if (!u || u.role !== "admin") {
        return res.status(403).json({ message: "Không có quyền tải hóa đơn này" });
      }
    }

    const doc = new PDFDocument({ size: "A4", margin: 50 });
    const fileName = `hoa-don-${booking._id}.pdf`;

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="${fileName}"`);

    doc.pipe(res);

    const pageWidth = doc.page.width;
    const left = 50;
    const right = pageWidth - 50;

    const roomTotal = Math.max(
      0,
      Number(booking.total_price || 0) - Number(booking.service_fee || 0),
    );

    // Header stripe
    doc
      .rect(0, 0, pageWidth, 110)
      .fill("#0d6efd");
    doc
      .fillColor("#ffffff")
      .font("Helvetica-Bold")
      .fontSize(24)
      .text("THINH PHAT HOTEL", left, 30, { align: "left" });
    doc
      .font("Helvetica")
      .fontSize(12)
      .text("BOOKING INVOICE", left, 62, { align: "left" });
    doc
      .font("Helvetica")
      .fontSize(11)
      .text(`Invoice: INV-${booking._id}`, left, 88, { align: "left" });

    doc
      .font("Helvetica")
      .fontSize(11)
      .text(`Issued: ${formatDateVi(new Date())}`, left, 88, {
        align: "right",
        width: right - left,
      });

    // Main content wrapper
    doc
      .roundedRect(left, 130, right - left, 640, 8)
      .lineWidth(1)
      .strokeColor("#e5e7eb")
      .stroke();

    // Customer block
    doc
      .roundedRect(left + 16, 150, (right - left) / 2 - 24, 130, 6)
      .fillAndStroke("#f8fafc", "#dbeafe");
    doc
      .fillColor("#0f172a")
      .font("Helvetica-Bold")
      .fontSize(12)
      .text("CUSTOMER", left + 28, 165);
    doc
      .font("Helvetica")
      .fontSize(11)
      .text(`Name: ${booking.user_id?.name || "Guest"}`, left + 28, 190)
      .text(`Email: ${booking.user_id?.email || "N/A"}`, left + 28, 210)
      .text(`Payment: MoMo`, left + 28, 230);

    // Booking block
    const bookingBlockX = left + (right - left) / 2 + 8;
    doc
      .roundedRect(bookingBlockX, 150, (right - left) / 2 - 24, 130, 6)
      .fillAndStroke("#f8fafc", "#dbeafe");
    doc
      .fillColor("#0f172a")
      .font("Helvetica-Bold")
      .fontSize(12)
      .text("BOOKING", bookingBlockX + 12, 165);
    doc
      .font("Helvetica")
      .fontSize(11)
      .text(`Booking ID: ${booking._id}`, bookingBlockX + 12, 190, {
        width: (right - left) / 2 - 42,
      })
      .text(`Status: ${booking.status}`, bookingBlockX + 12, 230);

    // Detail table title
    doc
      .fillColor("#111827")
      .font("Helvetica-Bold")
      .fontSize(13)
      .text("Booking Details", left + 16, 305);

    // Simple detail rows
    const detailsStartY = 332;
    const rowH = 30;
    const tableLeft = left + 16;
    const tableRight = right - 16;
    const labelWidth = 200;
    const valueWidth = tableRight - tableLeft - labelWidth;
    const assignedRoomNo = booking.assigned_room_id?.room_no || "";
    const assignedRoomName = booking.assigned_room_id?.name || "";
    const roomDisplayName =
      assignedRoomName || booking.room_id?.name || "N/A";
    const roomNumberDisplay =
      assignedRoomNo || "Pending assignment (waiting for admin confirmation)";

    const detailRows = [
      ["Room", roomDisplayName],
      ["Room number", roomNumberDisplay],
      ["Check-in date", formatDateVi(booking.check_in_date)],
      ["Check-out date", formatDateVi(booking.check_out_date)],
      ["Room quantity", String(booking.room_quantity || 1)],
    ];

    detailRows.forEach(([label, value], index) => {
      const y = detailsStartY + index * rowH;
      if (index % 2 === 0) {
        doc.rect(tableLeft, y, tableRight - tableLeft, rowH).fill("#f9fafb");
      }
      doc
        .fillColor("#111827")
        .font("Helvetica-Bold")
        .fontSize(10.5)
        .text(label, tableLeft + 10, y + 9, { width: labelWidth - 16 });
      doc
        .font("Helvetica")
        .text(value, tableLeft + labelWidth + 8, y + 9, { width: valueWidth - 16 });
      doc
        .moveTo(tableLeft, y + rowH)
        .lineTo(tableRight, y + rowH)
        .strokeColor("#e5e7eb")
        .lineWidth(0.8)
        .stroke();
    });

    // Payment summary
    const payBoxY = detailsStartY + detailRows.length * rowH + 30;
    const payBoxH = 150;
    doc
      .roundedRect(tableLeft, payBoxY, tableRight - tableLeft, payBoxH, 6)
      .fillAndStroke("#eff6ff", "#bfdbfe");

    doc
      .fillColor("#1e3a8a")
      .font("Helvetica-Bold")
      .fontSize(13)
      .text("Payment Summary", tableLeft + 14, payBoxY + 14);

    doc
      .fillColor("#111827")
      .font("Helvetica")
      .fontSize(11)
      .text(`Room amount: ${formatCurrencyVND(roomTotal)}`, tableLeft + 14, payBoxY + 42)
      .text(`Service fee: ${formatCurrencyVND(booking.service_fee)}`, tableLeft + 14, payBoxY + 64);

    doc
      .moveTo(tableLeft + 14, payBoxY + 92)
      .lineTo(tableRight - 14, payBoxY + 92)
      .strokeColor("#93c5fd")
      .lineWidth(1)
      .stroke();

    doc
      .font("Helvetica-Bold")
      .fontSize(14)
      .fillColor("#0f172a")
      .text(`Total: ${formatCurrencyVND(booking.total_price)}`, tableLeft + 14, payBoxY + 104);

    // Footer note
    doc
      .fillColor("#6b7280")
      .font("Helvetica-Oblique")
      .fontSize(10)
      .text("Thank you for choosing Thinh Phat Hotel. We look forward to serving you again.", left, 790, {
        align: "center",
        width: right - left,
      });

    doc.end();
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
