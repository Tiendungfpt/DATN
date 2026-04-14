import mongoose from "mongoose";
import PDFDocument from "pdfkit";
import fs from "fs";
import Booking from "../models/Booking.js";
import Rooms from "../models/rooms.js";
import RoomType from "../models/RoomType.js";
import User from "../models/User.js";
import Invoice from "../models/Invoice.js";
import BookingService from "../models/BookingService.js";
import Service from "../models/Service.js";
import { parseStayDates } from "../utils/bookingAvailability.js";
import { createNotification } from "../utils/notification.js";
import { ROOM_OCCUPYING_BOOKING_STATUSES } from "../utils/bookingSchedule.js";
import {
  nightsBetween,
  computeRoomSubtotal,
  countBookablePhysicalRoomsByType,
  sumReservedSlotsForRoomType,
  getPhysicallyBusyRoomIds,
  loadRoomTypeForBooking,
} from "../utils/hotelBooking.js";

const LEGACY_COMPLETED = "completed";
const OUT_COMPLETED = "checked_out";

function mapStatusForApi(status) {
  if (status === LEGACY_COMPLETED) return OUT_COMPLETED;
  return status;
}

function attachCanReview(booking) {
  const st = mapStatusForApi(booking.status);
  const isCanReview = st === OUT_COMPLETED && !booking.isReviewed;
  return { ...booking, status: st, isCanReview };
}

function formatCurrencyVND(value) {
  return `${Number(value || 0).toLocaleString("vi-VN")} VND`;
}

function formatDateVi(dateValue) {
  if (!dateValue) return "";
  return new Date(dateValue).toLocaleDateString("vi-VN");
}

function normalizePhone(value) {
  return String(value || "").replace(/\D/g, "");
}

function resolveExistingPath(candidates) {
  for (const p of candidates) {
    if (p && fs.existsSync(p)) return p;
  }
  return null;
}

async function syncRoomStatus(roomIdOrList) {
  const raw = Array.isArray(roomIdOrList) ? roomIdOrList : [roomIdOrList];
  const ids = raw.filter(Boolean);
  for (const id of ids) {
    const occupied = await Booking.exists({
      status: { $in: ROOM_OCCUPYING_BOOKING_STATUSES },
      $or: [{ assigned_room_id: id }, { assigned_room_ids: id }],
    });
    const next = occupied ? "occupied" : "available";
    await Rooms.findByIdAndUpdate(id, { status: next });
  }
}

/** GET /api/bookings — admin: sort + optional ?status= */
export const getAllBookingsAdmin = async (req, res) => {
  try {
    const sort = String(req.query.sort || "createdAt_desc");
    const statusFilter = req.query.status ? String(req.query.status) : null;

    const q = {};
    if (statusFilter) {
      if (statusFilter === OUT_COMPLETED) {
        q.status = { $in: [OUT_COMPLETED, LEGACY_COMPLETED] };
      } else {
        q.status = statusFilter;
      }
    }

    const sortObj =
      sort === "createdAt_asc" ? { createdAt: 1 } : { createdAt: -1 };

    const bookings = await Booking.find(q)
      .populate("user_id", "name email")
      .populate("room_type_id", "name price description maxGuests")
      .populate("line_items.room_type_id", "name price maxGuests")
      .populate("room_id", "name image price capacity room_no room_type roomType")
      .populate("assigned_room_id", "name image price capacity room_no status")
      .populate("assigned_room_ids", "name image price capacity room_no status")
      .populate("invoice_id")
      .sort(sortObj)
      .lean();

    return res.json(bookings.map((b) => attachCanReview(b)));
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

export const createBooking = async (req, res) => {
  try {
    const userId = req.userId;
    const roomTypeRaw = req.body.room_type_id ?? req.body.roomType;
    const checkInRaw = req.body.check_in_date ?? req.body.checkInDate;
    const checkOutRaw = req.body.check_out_date ?? req.body.checkOutDate;
    const qtyRaw = req.body.room_quantity ?? req.body.quantity;
    const rawLineItems = req.body.line_items;
    const {
      guest_name: guestNameRaw,
      guest_phone: guestPhoneRaw,
      guest_email: guestEmailRaw,
      payment_mode = "full",
      prepaid_amount: prepaidRaw,
    } = req.body;

    const forbiddenRoom =
      (req.body.room_id != null && req.body.room_id !== "") ||
      (Array.isArray(req.body.assigned_room_ids) && req.body.assigned_room_ids.length > 0);
    if (forbiddenRoom) {
      return res.status(400).json({
        message: "Không được gửi room_id hoặc danh sách phòng khi tạo booking",
      });
    }

    const currentUser = await User.findById(userId).select("role name email").lean();
    if (!currentUser) {
      return res.status(401).json({ message: "User not found" });
    }
    if (currentUser.role === "admin") {
      return res.status(403).json({
        message: "Tài khoản admin không được phép đặt phòng",
      });
    }

    const guest_name = String(guestNameRaw ?? currentUser.name ?? "").trim();
    const guest_phone = String(guestPhoneRaw ?? "").trim();
    const guest_email = String(guestEmailRaw ?? currentUser.email ?? "")
      .trim()
      .toLowerCase();
    if (!guest_name || !guest_phone || !guest_email) {
      return res.status(400).json({
        message: "Required: guest_name, guest_phone, guest_email",
      });
    }

    const parsed = parseStayDates(checkInRaw, checkOutRaw);
    if (parsed.error) {
      return res.status(400).json({ message: parsed.error });
    }
    const { start, end } = parsed;
    const n = nightsBetween(start, end);
    const prepaid = Math.max(0, Number(prepaidRaw) || 0);

    let lineItemsToSave = [];
    let roomTypeIdStr = null;
    let totalQty = 0;
    let estimated = 0;

    if (Array.isArray(rawLineItems) && rawLineItems.length > 0) {
      const merged = new Map();
      for (const row of rawLineItems) {
        const tid = row.room_type_id ?? row.roomType;
        if (!mongoose.isValidObjectId(tid)) continue;
        const q = Math.max(1, Number.parseInt(String(row.quantity), 10) || 1);
        const k = String(tid);
        merged.set(k, (merged.get(k) || 0) + q);
      }
      if (merged.size === 0) {
        return res.status(400).json({
          message: "line_items: can room_type_id (ObjectId) va quantity hop le",
        });
      }
      for (const [rtid, q] of merged) {
        const roomTypeDoc = await RoomType.findById(rtid).lean();
        if (!roomTypeDoc) {
          return res.status(404).json({ message: "Khong tim thay loai phong" });
        }
        const physical = await countBookablePhysicalRoomsByType(rtid);
        if (physical < 1) {
          return res.status(409).json({
            message: `Loai "${roomTypeDoc.name}" chua gan phong vat ly hoac dang bao tri.`,
          });
        }
        const reserved = await sumReservedSlotsForRoomType(rtid, start, end, null);
        if (reserved + q > physical) {
          return res.status(409).json({
            message: `Khong du phong trong khoang ngay da chon cho loai "${roomTypeDoc.name}" (dat ${q} phong). Co the chon them loai phong khac trong cung don.`,
          });
        }
        const lineSub = computeRoomSubtotal(roomTypeDoc.price, n, q);
        estimated += lineSub;
        lineItemsToSave.push({
          room_type_id: rtid,
          quantity: q,
          unit_price_per_night: roomTypeDoc.price,
          line_subtotal: lineSub,
        });
      }
      totalQty = lineItemsToSave.reduce((s, li) => s + li.quantity, 0);
      roomTypeIdStr = String(lineItemsToSave[0].room_type_id);
    } else {
      const roomTypeIdSingle =
        roomTypeRaw && mongoose.isValidObjectId(roomTypeRaw) ? String(roomTypeRaw) : null;
      if (!roomTypeIdSingle) {
        return res.status(400).json({
          message: "Can room_type_id hoac mang line_items",
        });
      }
      const roomType = await RoomType.findById(roomTypeIdSingle).lean();
      if (!roomType) {
        return res.status(404).json({ message: "Không tìm thấy loại phòng" });
      }
      const quantity = Number.parseInt(qtyRaw, 10) || 1;
      if (!Number.isInteger(quantity) || quantity < 1) {
        return res.status(400).json({
          message: "Số lượng phòng phải là số nguyên >= 1",
        });
      }
      const physical = await countBookablePhysicalRoomsByType(roomTypeIdSingle);
      if (physical < 1) {
        return res.status(409).json({
          message:
            "No physical rooms linked to this room type (or all in maintenance). Contact the hotel.",
        });
      }
      const reserved = await sumReservedSlotsForRoomType(roomTypeIdSingle, start, end, null);
      if (reserved + quantity > physical) {
        return res.status(409).json({
          message: "Không còn phòng trống cho loại phòng trong khoảng ngày đã chọn",
        });
      }
      roomTypeIdStr = roomTypeIdSingle;
      totalQty = quantity;
      estimated = computeRoomSubtotal(roomType.price, n, quantity);
    }

    if (!["deposit", "full"].includes(payment_mode)) {
      return res.status(400).json({ message: "payment_mode phải là deposit hoặc full" });
    }
    if (payment_mode === "full") {
      if (Math.abs(prepaid - estimated) > 1) {
        return res.status(400).json({
          message: `Full payment must equal estimated room total ${estimated} VND`,
        });
      }
    } else if (payment_mode === "deposit") {
      if (prepaid <= 0 || prepaid >= estimated) {
        return res.status(400).json({
          message: "Deposit: amount must be > 0 and < estimated room total",
        });
      }
    }

    const booking = await Booking.create({
      user_id: userId,
      room_type_id: roomTypeIdStr,
      room_id: null,
      line_items: lineItemsToSave,
      guest_name,
      guest_phone,
      guest_email,
      check_in_date: start,
      check_out_date: end,
      room_quantity: totalQty,
      payment_mode,
      prepaid_amount: prepaid,
      estimated_room_total: estimated,
      total_price: estimated,
      service_fee: 0,
      services: [],
      is_paid: false,
      status: "pending",
      assigned_room_ids: [],
    });

    const populated = await Booking.findById(booking._id)
      .populate("room_type_id", "name price description")
      .populate("line_items.room_type_id", "name price description maxGuests")
      .lean();

    return res.status(201).json({
      message: "Đặt phòng thành công",
      booking: attachCanReview(populated),
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

export const getMyBookings = async (req, res) => {
  try {
    const bookings = await Booking.find({ user_id: req.userId })
      .populate("room_type_id", "name price description")
      .populate("line_items.room_type_id", "name price maxGuests")
      .populate("room_id", "name image price capacity room_no")
      .populate("assigned_room_id", "name image price capacity room_no")
      .populate("assigned_room_ids", "name room_no")
      .populate("invoice_id")
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
      .populate("room_type_id", "name price description maxGuests")
      .populate("line_items.room_type_id", "name price maxGuests")
      .populate("room_id", "name image price capacity status room_no")
      .populate("assigned_room_id", "name image price capacity status room_no")
      .populate("assigned_room_ids", "name image price capacity status room_no")
      .populate("invoice_id")
      .lean();

    if (!booking) {
      return res.status(404).json({ message: "Không tìm thấy booking" });
    }

    const ownerId = booking.user_id?._id ?? booking.user_id;
    const isOwner = String(ownerId) === String(req.userId);
    if (!isOwner) {
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

/**
 * Invoice PDF only after check-out (Invoice document exists).
 * GET /api/bookings/:id/invoice
 */
export const downloadBookingInvoice = async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id)
      .populate("user_id", "name email")
      .populate("room_type_id", "name price")
      .populate("line_items.room_type_id", "name price")
      .populate("assigned_room_ids", "name room_no")
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

    const st = mapStatusForApi(booking.status);
    if (st !== OUT_COMPLETED || !booking.invoice_id) {
      return res.status(403).json({
        message: "Invoice exists only after check-out (no Invoice yet)",
      });
    }

    const invoice = await Invoice.findById(booking.invoice_id).lean();
    if (!invoice) {
      return res.status(404).json({ message: "Không tìm thấy hóa đơn" });
    }

    if (isOwner && invoice.status !== "paid") {
      return res.status(403).json({
        message: "Hóa đơn chưa được đánh dấu thanh toán",
      });
    }

    const doc = new PDFDocument({ size: "A4", margin: 50 });
    const fileName = `${invoice.invoice_number || "invoice"}.pdf`;

    const regularFontPath = resolveExistingPath([
      "C:/Windows/Fonts/arial.ttf",
      "C:/Windows/Fonts/tahoma.ttf",
    ]);
    const boldFontPath = resolveExistingPath([
      "C:/Windows/Fonts/arialbd.ttf",
      "C:/Windows/Fonts/tahomabd.ttf",
    ]);
    const italicFontPath = resolveExistingPath([
      "C:/Windows/Fonts/ariali.ttf",
      "C:/Windows/Fonts/tahoma.ttf",
    ]);

    const fontRegular = regularFontPath ? "invoice-regular" : "Helvetica";
    const fontBold = boldFontPath ? "invoice-bold" : "Helvetica-Bold";
    const fontItalic = italicFontPath ? "invoice-italic" : "Helvetica-Oblique";

    if (regularFontPath) doc.registerFont(fontRegular, regularFontPath);
    if (boldFontPath) doc.registerFont(fontBold, boldFontPath);
    if (italicFontPath) doc.registerFont(fontItalic, italicFontPath);

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="${fileName}"`);

    doc.pipe(res);

    const pageWidth = doc.page.width;
    const left = 50;
    const right = pageWidth - 50;

    doc.rect(0, 0, pageWidth, 110).fill("#0d6efd");
    doc
      .fillColor("#ffffff")
      .font(fontBold)
      .fontSize(24)
      .text("THINH PHAT HOTEL", left, 30, { align: "left" });
    doc.font(fontRegular).fontSize(12).text("INVOICE (POST CHECK-OUT)", left, 62);
    doc
      .font(fontRegular)
      .fontSize(11)
      .text(`Số HĐ: ${invoice.invoice_number}`, left, 88, { align: "left" });
    doc
      .font(fontRegular)
      .fontSize(11)
      .text(`Ngày: ${formatDateVi(invoice.paid_at || invoice.createdAt)}`, left, 88, {
        align: "right",
        width: right - left,
      });

    doc
      .roundedRect(left, 130, right - left, 520, 8)
      .lineWidth(1)
      .strokeColor("#e5e7eb")
      .stroke();

    doc.fillColor("#0f172a").font(fontBold).fontSize(12).text("CUSTOMER", left + 28, 150);
    doc
      .font(fontRegular)
      .fontSize(11)
      .text(`Name: ${booking.user_id?.name || booking.guest_name || "Guest"}`, left + 28, 175)
      .text(
        `Email: ${booking.guest_email || booking.user_id?.email || "N/A"}`,
        left + 28,
        195,
      )
      .text(`CCCD: ${booking.guest_id_number || "—"}`, left + 28, 215)
      .text(`Phone: ${booking.guest_phone || "—"}`, left + 28, 235);

    const roomsLine =
      (booking.assigned_room_ids || [])
        .map((r) => `${r.name || ""} ${r.room_no || ""}`.trim())
        .filter(Boolean)
        .join(", ") || "—";

    doc
      .fillColor("#111827")
      .font(fontBold)
      .fontSize(12)
      .text("Stay", left + 28, 270)
      .font(fontRegular)
      .fontSize(11)
      .text(
        `Loại phòng: ${
          Array.isArray(booking.line_items) && booking.line_items.length > 0
            ? booking.line_items
                .map(
                  (li) =>
                    `${li.room_type_id?.name || "—"} x${li.quantity ||1}`,
                )
                .join("; ")
            : booking.room_type_id?.name || "—"
        }`,
        left + 28,
        290,
      )
      .text(`Phòng: ${roomsLine}`, left + 28, 310)
      .text(`Check-in: ${formatDateVi(booking.check_in_date)}`, left + 28, 330)
      .text(`Check-out: ${formatDateVi(booking.check_out_date)}`, left + 28, 350);

    doc
      .font(fontBold)
      .fontSize(13)
      .text("Amounts", left + 28, 400)
      .font(fontRegular)
      .fontSize(11)
      .fillColor("#111827")
      .text(`Tiền phòng: ${formatCurrencyVND(invoice.room_subtotal)}`, left + 28, 425)
      .text(`Dịch vụ: ${formatCurrencyVND(invoice.service_subtotal)}`, left + 28, 445)
      .text(`Prepaid: ${formatCurrencyVND(invoice.prepaid_amount)}`, left + 28, 465)
      .text(`Phải thu (checkout): ${formatCurrencyVND(invoice.balance_due)}`, left + 28, 485);

    doc
      .font(fontBold)
      .fontSize(14)
      .fillColor("#0f172a")
      .text(`Grand total: ${formatCurrencyVND(invoice.grand_total)}`, left + 28, 515);

    doc
      .fillColor("#6b7280")
      .font(fontItalic)
      .fontSize(10)
      .text(
        "Thank you for choosing Thinh Phat Hotel.",
        left,
        720,
        { align: "center", width: right - left },
      );

    doc.end();
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

/**
 * Check-in: collect guest ID + assign concrete rooms (same count as room_quantity).
 * PUT /api/bookings/:id/check-in
 */
export const checkInBooking = async (req, res) => {
  try {
    const { guest_name, guest_phone, guest_id_number, assigned_room_ids } = req.body || {};

    const booking = await Booking.findById(req.params.id);
    if (!booking) {
      return res.status(404).json({ message: "Không tìm thấy booking" });
    }
    if (booking.status !== "confirmed") {
      return res.status(400).json({
        message: "Check-in only when booking status is confirmed",
      });
    }

    const gName = String(guest_name || "").trim();
    const gPhone = String(guest_phone || "").trim();
    const gId = String(guest_id_number || "").trim();
    if (!gName || !gPhone || !gId) {
      return res.status(400).json({
        message: "Required: guest_name, guest_phone, guest_id_number (national ID)",
      });
    }

    const storedPhone = String(booking.guest_phone || "").trim();
    if (!storedPhone) {
      return res.status(400).json({
        message: "Booking thiếu số điện thoại lúc đặt; không thể đối chiếu",
      });
    }
    if (normalizePhone(gPhone) !== normalizePhone(storedPhone)) {
      return res.status(400).json({
        message: "Số điện thoại không khớp với thông tin đặt phòng",
      });
    }

    const ids = Array.isArray(assigned_room_ids) ? assigned_room_ids : [];
    if (ids.length !== booking.room_quantity) {
      return res.status(400).json({
        message: `Cần chọn đúng ${booking.room_quantity} phòng`,
      });
    }
    const uniq = new Set(ids.map(String));
    if (uniq.size !== ids.length) {
      return res.status(400).json({ message: "Không được trùng phòng" });
    }

    const lineItems = Array.isArray(booking.line_items) ? booking.line_items : [];
    const needByType = new Map();
    if (lineItems.length > 0) {
      for (const li of lineItems) {
        const tid = String(li.room_type_id);
        needByType.set(
          tid,
          (needByType.get(tid) || 0) + Math.max(1, Number(li.quantity) || 1),
        );
      }
    } else {
      if (!booking.room_type_id) {
        return res.status(400).json({ message: "Booking thiếu room_type_id" });
      }
      needByType.set(String(booking.room_type_id), booking.room_quantity);
    }

    const busy = await getPhysicallyBusyRoomIds(
      booking.check_in_date,
      booking.check_out_date,
      booking._id,
    );

    const gotByType = new Map();
    for (const rid of ids) {
      if (!mongoose.isValidObjectId(rid)) {
        return res.status(400).json({ message: "assigned_room_ids invalid" });
      }
      const room = await Rooms.findById(rid).lean();
      if (!room) {
        return res.status(404).json({ message: `Không tìm thấy phòng ${rid}` });
      }
      const tid = String(room.roomType || "");
      if (!tid) {
        return res.status(400).json({
          message: `Phòng ${room.room_no || rid} chưa gán loại (roomType)`,
        });
      }
      gotByType.set(tid, (gotByType.get(tid) || 0) + 1);
      if (room.status === "maintenance") {
        return res.status(409).json({ message: `Phòng ${room.room_no} đang bảo trì` });
      }
      if (busy.has(String(rid))) {
        return res.status(409).json({ message: `Phòng ${room.room_no} đang bận` });
      }
    }

    for (const [tid, need] of needByType) {
      const got = gotByType.get(tid) || 0;
      if (got !== need) {
        return res.status(400).json({
          message: `Số phòng theo loại không khớp đơn: loại cần ${need} phòng, đã chọn ${got}.`,
        });
      }
    }
    for (const tid of gotByType.keys()) {
      if (!needByType.has(tid)) {
        return res.status(400).json({
          message: "Có phòng được chọn không thuộc loại trong đơn đặt.",
        });
      }
    }

    const prev = [...(booking.assigned_room_ids || [])];
    booking.guest_name = gName;
    booking.guest_phone = gPhone;
    booking.guest_id_number = gId;
    booking.assigned_room_ids = ids;
    booking.status = "checked_in";
    await booking.save();

    for (const p of prev) {
      await syncRoomStatus(p);
    }
    for (const id of ids) {
      await syncRoomStatus(id);
    }

    await createNotification({
      userId: booking.user_id,
      bookingId: booking._id,
      type: "checked_in",
      title: "Đã check-in",
      message: `Booking #${String(booking._id).slice(-6).toUpperCase()} đã check-in.`,
      eventKey: `checked_in_${booking._id}`,
    });

    const populated = await Booking.findById(booking._id)
      .populate("user_id", "name email")
      .populate("room_type_id", "name price")
      .populate("line_items.room_type_id", "name price")
      .populate("assigned_room_ids", "name room_no status")
      .lean();

    return res.json({
      message: "Check-in thành công",
      booking: attachCanReview(populated),
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

/**
 * Check-out: compute room + services, create Invoice, mark paid, release rooms.
 * PUT /api/bookings/:id/check-out body: { payment_method?, settle_balance: true }
 */
export const checkOutBooking = async (req, res) => {
  try {
    const { payment_method = "cash", settle_balance = true } = req.body || {};

    const booking = await Booking.findById(req.params.id);
    if (!booking) {
      return res.status(404).json({ message: "Không tìm thấy booking" });
    }
    if (booking.status !== "checked_in") {
      return res.status(400).json({
        message: "Check-out only when status is checked_in",
      });
    }
    if (booking.invoice_id) {
      return res.status(400).json({ message: "Booking đã có hóa đơn / đã checkout" });
    }

    let roomSubtotal = 0;
    const liArr = Array.isArray(booking.line_items) ? booking.line_items : [];
    if (liArr.length > 0) {
      roomSubtotal = liArr.reduce((s, li) => s + Number(li.line_subtotal || 0), 0);
    } else {
      const roomType = await RoomType.findById(booking.room_type_id).lean();
      if (!roomType) {
        return res.status(404).json({ message: "Không tìm thấy loại phòng" });
      }
      const n = nightsBetween(booking.check_in_date, booking.check_out_date);
      roomSubtotal = computeRoomSubtotal(roomType.price, n, booking.room_quantity);
    }

    const lines = await BookingService.find({ booking_id: booking._id }).lean();
    const serviceSubtotal = lines.reduce((s, l) => s + Number(l.line_total || 0), 0);

    const grand = roomSubtotal + serviceSubtotal;
    const prepaid = Math.max(0, Number(booking.prepaid_amount) || 0);
    const balanceDue = Math.max(0, grand - prepaid);

    const invNumber = `INV-${Date.now()}-${String(booking._id).slice(-6).toUpperCase()}`;

    const invoice = await Invoice.create({
      booking_id: booking._id,
      invoice_number: invNumber,
      room_subtotal: roomSubtotal,
      service_subtotal: serviceSubtotal,
      grand_total: grand,
      prepaid_amount: prepaid,
      balance_due: balanceDue,
      status: settle_balance ? "paid" : "unpaid",
      paid_at: settle_balance ? new Date() : null,
      payment_method: String(payment_method || "cash"),
    });

    booking.invoice_id = invoice._id;
    booking.total_price = grand;
    booking.status = OUT_COMPLETED;
    booking.is_paid = Boolean(settle_balance);
    await booking.save();

    const assigned = [...(booking.assigned_room_ids || [])];
    if (booking.assigned_room_id) assigned.push(booking.assigned_room_id);
    for (const id of assigned) {
      await syncRoomStatus(id);
    }

    await createNotification({
      userId: booking.user_id,
      bookingId: booking._id,
      type: "checked_out",
      title: "Đã check-out",
      message: `Booking #${String(booking._id).slice(-6).toUpperCase()} checked out. Total: ${grand} VND.`,
      eventKey: `checked_out_${booking._id}`,
    });

    const populated = await Booking.findById(booking._id)
      .populate("user_id", "name email")
      .populate("room_type_id", "name price")
      .populate("line_items.room_type_id", "name price")
      .populate("assigned_room_ids", "name room_no")
      .populate("invoice_id")
      .lean();

    return res.json({
      message: "Check-out thành công — đã tạo hóa đơn",
      booking: attachCanReview(populated),
      invoice,
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

export const updateBooking = async (req, res) => {
  try {
    const allowedStatus = ["pending", "confirmed", "cancelled"];
    if (req.body?.status && !allowedStatus.includes(req.body.status)) {
      return res.status(400).json({
        message: "Trạng thái booking không h��p lệ qua API này",
      });
    }

    const booking = await Booking.findById(req.params.id);
    if (!booking) {
      return res.status(404).json({ message: "Không tìm thấy" });
    }

    const terminal = [OUT_COMPLETED, LEGACY_COMPLETED, "cancelled"];
    if (terminal.includes(booking.status)) {
      return res.status(400).json({
        message: "Booking is finished or cancelled; cannot update",
      });
    }

    const nextStatus = req.body?.status || booking.status;

    if (nextStatus === "confirmed") {
      if (!["pending", "confirmed"].includes(booking.status)) {
        return res.status(400).json({
          message: "Can only confirm when status is pending or confirmed",
        });
      }
      // Nghiệp vụ mới: xác nhận KH��NG gán phòng c�� thể — gán lúc check-in.
      booking.status = "confirmed";
      await booking.save();
      await createNotification({
        userId: booking.user_id,
        bookingId: booking._id,
        type: "booking_confirmed",
        title: "Booking đã được xác nhận",
        message: `Admin đã xác nhận booking #${String(booking._id).slice(-6).toUpperCase()}.`,
        eventKey: `booking_confirmed_${booking._id}`,
      });
    } else if (nextStatus === "cancelled") {
      const prevAssigned = [...(booking.assigned_room_ids || [])];
      if (booking.assigned_room_id) prevAssigned.push(booking.assigned_room_id);
      booking.status = "cancelled";
      booking.assigned_room_ids = [];
      booking.assigned_room_id = null;
      await booking.save();
      for (const p of prevAssigned) {
        await syncRoomStatus(p);
      }
    } else {
      booking.status = nextStatus;
      await booking.save();
    }

    const populated = await Booking.findById(booking._id)
      .populate("user_id", "name email")
      .populate("room_type_id", "name price")
      .populate("room_id", "name image price capacity status room_no")
      .populate("assigned_room_id", "name image price capacity status room_no")
      .populate("assigned_room_ids", "name room_no")
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

    const busy = await getPhysicallyBusyRoomIds(
      booking.check_in_date,
      booking.check_out_date,
      booking._id,
    );

    const mapRoom = (r) => ({
      _id: r._id,
      name: r.name,
      room_no: r.room_no || "",
      status: r.status,
      price: r.price,
      capacity: r.capacity,
      roomType: r.roomType,
    });

    const lineItems = Array.isArray(booking.line_items) ? booking.line_items : [];
    if (lineItems.length > 0) {
      const linesOut = [];
      for (const li of lineItems) {
        const rtId = li.room_type_id;
        const rt = await RoomType.findById(rtId).lean();
        const physical = await Rooms.find({
          roomType: rtId,
          status: "available",
        }).lean();
        const rooms = physical.filter((r) => !busy.has(String(r._id))).map(mapRoom);
        linesOut.push({
          room_type_id: rtId,
          room_type_name: rt?.name || "",
          quantity: Math.max(1, Number(li.quantity) || 1),
          rooms,
        });
      }
      return res.json({
        booking_id: booking._id,
        multi: true,
        total_quantity: booking.room_quantity,
        lines: linesOut,
        rooms: linesOut.flatMap((L) => L.rooms),
      });
    }

    const roomTypeId = booking.room_type_id;
    if (!roomTypeId) {
      return res.status(404).json({ message: "Booking không có room_type_id" });
    }

    const rt = await RoomType.findById(roomTypeId).lean();
    if (!rt) {
      return res.status(404).json({ message: "Không tìm thấy loại phòng" });
    }

    const physical = await Rooms.find({
      roomType: roomTypeId,
      status: "available",
    }).lean();

    const rooms = physical.filter((r) => !busy.has(String(r._id))).map(mapRoom);

    return res.json({
      booking_id: booking._id,
      multi: false,
      room_type: rt.name,
      rooms,
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
    const st = mapStatusForApi(booking.status);
    if (st === "checked_in" || st === OUT_COMPLETED) {
      return res.status(400).json({
        message: "Cannot cancel after check-in or check-out",
      });
    }
    booking.status = "cancelled";
    const prev = [...(booking.assigned_room_ids || [])];
    if (booking.assigned_room_id) prev.push(booking.assigned_room_id);
    booking.assigned_room_ids = [];
    booking.assigned_room_id = null;
    await booking.save();
    for (const p of prev) {
      await syncRoomStatus(p);
    }
    return res.json({ message: "Booking cancelled", booking });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

export const deleteBooking = async (req, res) => {
  try {
    const deleted = await Booking.findByIdAndDelete(req.params.id);
    const prev = [...(deleted?.assigned_room_ids || [])];
    if (deleted?.assigned_room_id) prev.push(deleted.assigned_room_id);
    for (const p of prev) {
      await syncRoomStatus(p);
    }
    await BookingService.deleteMany({ booking_id: req.params.id });
    await Invoice.deleteMany({ booking_id: req.params.id });
    return res.json({ message: "Xóa booking thành công" });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

export const paymentBooking = async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id).populate("room_type_id", "name price");
    if (!booking) {
      return res.status(404).json({ message: "Không tìm thấy booking" });
    }
    if (booking.status === "cancelled") {
      return res.status(400).json({ message: "Booking cancelled; cannot pay" });
    }
    const terminal = [OUT_COMPLETED, LEGACY_COMPLETED];
    if (terminal.includes(booking.status)) {
      return res.status(400).json({ message: "Booking đã hoàn tất" });
    }
    return res.json({
      message: "Ready for payment (MoMo / desk). Admin may confirm separately.",
      booking,
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

/** POST /api/bookings/:id/services — add incidental */
export const addBookingServiceLine = async (req, res) => {
  try {
    const { service_id, quantity = 1, unit_price: unitOverride, note = "" } = req.body || {};
    if (!mongoose.isValidObjectId(service_id)) {
      return res.status(400).json({ message: "service_id invalid" });
    }

    const booking = await Booking.findById(req.params.id);
    if (!booking) {
      return res.status(404).json({ message: "Không tìm thấy booking" });
    }
    if (booking.status !== "checked_in") {
      return res.status(400).json({
        message: "Services can only be added while checked_in",
      });
    }

    const svc = await Service.findById(service_id).lean();
    if (!svc || !svc.isActive) {
      return res.status(404).json({ message: "Không tìm thấy dịch vụ" });
    }

    const qty = Math.max(1, Number.parseInt(quantity, 10) || 1);
    const unit = unitOverride != null ? Number(unitOverride) : Number(svc.defaultPrice);
    if (!Number.isFinite(unit) || unit < 0) {
      return res.status(400).json({ message: "unit_price invalid" });
    }
    const lineTotal = unit * qty;

    const line = await BookingService.create({
      booking_id: booking._id,
      service_id: svc._id,
      quantity: qty,
      unit_price: unit,
      line_total: lineTotal,
      note: String(note || "").trim(),
    });

    const populated = await BookingService.findById(line._id)
      .populate("service_id", "name category defaultPrice")
      .lean();

    return res.status(201).json({ message: "Đã thêm dịch vụ", line: populated });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

/** GET /api/bookings/:id/services */
export const getBookingServiceLines = async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id).lean();
    if (!booking) {
      return res.status(404).json({ message: "Không tìm thấy booking" });
    }
    const lines = await BookingService.find({ booking_id: booking._id })
      .populate("service_id", "name category defaultPrice")
      .sort({ createdAt: -1 })
      .lean();
    return res.json(lines);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

/** GET /api/bookings/:id/checkout-preview */
export const getCheckOutPreview = async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id).lean();
    if (!booking) {
      return res.status(404).json({ message: "Không tìm thấy booking" });
    }
    if (booking.status !== "checked_in") {
      return res.status(400).json({
        message: "Checkout preview only when checked_in",
      });
    }
    let roomSubtotal = 0;
    const liBooking = Array.isArray(booking.line_items) ? booking.line_items : [];
    if (liBooking.length > 0) {
      roomSubtotal = liBooking.reduce((s, li) => s + Number(li.line_subtotal || 0), 0);
    } else {
      const roomType = await loadRoomTypeForBooking(booking);
      if (!roomType?.price) {
        return res.status(400).json({ message: "Không tính được giá phòng" });
      }
      const n = nightsBetween(new Date(booking.check_in_date), new Date(booking.check_out_date));
      roomSubtotal = computeRoomSubtotal(roomType.price, n, booking.room_quantity);
    }
    const lines = await BookingService.find({ booking_id: booking._id }).lean();
    const serviceSubtotal = lines.reduce((s, l) => s + Number(l.line_total || 0), 0);
    const grand = roomSubtotal + serviceSubtotal;
    const prepaid = Math.max(0, Number(booking.prepaid_amount) || 0);
    return res.json({
      room_subtotal: roomSubtotal,
      service_subtotal: serviceSubtotal,
      grand_total: grand,
      prepaid_amount: prepaid,
      balance_due: Math.max(0, grand - prepaid),
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};
