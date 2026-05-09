import mongoose from "mongoose";
import PDFDocument from "pdfkit";
import fs from "fs";
import Booking from "../models/Booking.js";
import Rooms from "../models/rooms.js";
import RoomType from "../models/RoomType.js";
import User from "../models/User.js";
import Invoice from "../models/Invoice.js";
import BookingService from "../models/BookingService.js";
import BookingGuest from "../models/BookingGuest.js";
import BookingCharge from "../models/BookingCharge.js";
import Service from "../models/Service.js";
import { parseStayDates } from "../utils/bookingAvailability.js";
import { createNotification } from "../utils/notification.js";
import { sendRefundStatusEmail } from "../services/emailService.js";
import { ROOM_OCCUPYING_BOOKING_STATUSES } from "../utils/bookingSchedule.js";
import PaymentTransaction from "../models/PaymentTransaction.js";
import DiscountCode from "../models/DiscountCode.js";
import { evaluateDiscountCode } from "./discountCodeController.js";
import {
  computeHoursUntilArrival,
  computeRefundAmount,
  isDepositSufficient,
} from "../utils/bookingPolicy.js";
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

function normalizeRatePlanKey(value) {
  return "basic";
}

function resolveBookingRatePlanKey(booking) {
  if (Array.isArray(booking?.line_items) && booking.line_items.length > 0) {
    const first = booking.line_items[0];
    return normalizeRatePlanKey(first?.rate_plan_key);
  }
  return "basic";
}

function resolveNightlyPriceByRatePlan(baseNightly, ratePlanKey) {
  const base = Math.max(0, Number(baseNightly) || 0);
  normalizeRatePlanKey(ratePlanKey);
  return base;
}

function computeSubtotal(unitPrice, units, quantity) {
  return Math.max(0, Number(unitPrice) || 0) * Math.max(1, Number(units) || 1) * Math.max(1, Number(quantity) || 1);
}

function resolveExistingPath(candidates) {
  for (const p of candidates) {
    if (p && fs.existsSync(p)) return p;
  }
  return null;
}

function isSameLocalDate(a, b) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function withinLocalTimeWindow(dateValue, { startHour, endHour }) {
  const h = dateValue.getHours() + dateValue.getMinutes() / 60;
  return h >= startHour && h <= endHour;
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
    const depositStatusFilter = req.query.deposit_status
      ? String(req.query.deposit_status).trim()
      : null;

    const q = {};
    if (!depositStatusFilter) {
      // Default policy: admin chỉ thấy booking đã thanh toán (full hoặc đủ cọc)
      q.$or = [
        { payment_mode: "full", is_paid: true },
        { payment_mode: "deposit", deposit_status: "paid" },
      ];
    }
    if (statusFilter) {
      if (statusFilter === OUT_COMPLETED) {
        q.status = { $in: [OUT_COMPLETED, LEGACY_COMPLETED] };
      } else {
        q.status = statusFilter;
      }
    }
    if (depositStatusFilter) {
      q.deposit_status = depositStatusFilter;
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
      booking_type: bookingTypeRaw,
      discount_code: discountCodeRaw,
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

    const requestedBookingType = String(bookingTypeRaw || "overnight").trim().toLowerCase();
    if (requestedBookingType !== "overnight") {
      return res.status(400).json({ message: "Hệ thống hiện chỉ hỗ trợ đặt theo đêm" });
    }
    const bookingType = "overnight";

    let start;
    let end;
    let stayUnits;

    const parsed = parseStayDates(checkInRaw, checkOutRaw);
    if (parsed.error) {
      return res.status(400).json({ message: parsed.error });
    }
    start = parsed.start;
    end = parsed.end;
    stayUnits = nightsBetween(start, end);

    const prepaid = Math.max(0, Number(prepaidRaw) || 0);

    let lineItemsToSave = [];
    let roomTypeIdStr = null;
    let totalQty = 0;
    let estimated = 0;
    let depositAmount = 0;
    let discountAmount = 0;
    let discountCode = "";
    let discountCodeId = null;

    if (Array.isArray(rawLineItems) && rawLineItems.length > 0) {
      const merged = new Map();
      for (const row of rawLineItems) {
        const tid = row.room_type_id ?? row.roomType;
        if (!mongoose.isValidObjectId(tid)) continue;
        const ratePlanKey = normalizeRatePlanKey(row.rate_plan_key ?? row.ratePlanKey ?? row.rate_plan);
        const q = Math.max(1, Number.parseInt(String(row.quantity), 10) || 1);
        const k = String(tid);
        const prev = merged.get(k) || { room_type_id: String(tid), rate_plan_key: "basic", quantity: 0 };
        merged.set(k, { ...prev, quantity: prev.quantity + q });
      }
      if (merged.size === 0) {
        return res.status(400).json({
          message: "line_items: can room_type_id (ObjectId) va quantity hop le",
        });
      }
      for (const [, row] of merged) {
        const rtid = String(row.room_type_id);
        const q = Math.max(1, Number(row.quantity) || 1);
        const ratePlanKey = normalizeRatePlanKey(row.rate_plan_key);
        const roomTypeDoc = await RoomType.findById(rtid).lean();
        if (!roomTypeDoc) {
          return res.status(404).json({ message: "Khong tim thay loai phong" });
        }
        const rtDeposit = Math.max(0, Number(roomTypeDoc.deposit_amount) || 0);
        if (payment_mode === "deposit" && rtDeposit <= 0) {
          return res.status(400).json({
            message: `Loai "${roomTypeDoc.name}" chua cau hinh tien coc (deposit_amount).`,
          });
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
        const unitPrice = resolveNightlyPriceByRatePlan(Number(roomTypeDoc.price) || 0, ratePlanKey);
        const lineSub = computeSubtotal(unitPrice, stayUnits, q);
        estimated += lineSub;
        depositAmount += rtDeposit * q;
        lineItemsToSave.push({
          room_type_id: rtid,
          rate_plan_key: ratePlanKey,
          quantity: q,
          unit_price_per_night: unitPrice,
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
      const rtDeposit = Math.max(0, Number(roomType.deposit_amount) || 0);
      if (payment_mode === "deposit" && rtDeposit <= 0) {
        return res.status(400).json({
          message: `Loai "${roomType.name}" chua cau hinh tien coc (deposit_amount).`,
        });
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
      const unitPrice = resolveNightlyPriceByRatePlan(
        Number(roomType.price) || 0,
        req.body.rate_plan_key ?? req.body.ratePlanKey,
      );
      estimated = computeSubtotal(unitPrice, stayUnits, quantity);
      // Policy: tiền cọc không được vượt quá tổng tiền phòng ước tính
      depositAmount = Math.min(rtDeposit * quantity, estimated);
      lineItemsToSave.push({
        room_type_id: roomTypeIdSingle,
        rate_plan_key: normalizeRatePlanKey(req.body.rate_plan_key ?? req.body.ratePlanKey),
        quantity,
        unit_price_per_night: unitPrice,
        line_subtotal: estimated,
      });
    }

    if (!["deposit", "full"].includes(payment_mode)) {
      return res.status(400).json({ message: "payment_mode phải là deposit hoặc full" });
    }

    if (discountCodeRaw) {
      const discountEval = await evaluateDiscountCode(discountCodeRaw, estimated);
      if (!discountEval.ok) {
        return res.status(400).json({ message: discountEval.message });
      }
      discountAmount = Math.max(0, Number(discountEval.discount_amount) || 0);
      discountCode = String(discountEval.code || "").trim().toUpperCase();
      discountCodeId = discountEval.discount_code_id;
      estimated = Math.max(0, estimated - discountAmount);
      depositAmount = Math.min(depositAmount, estimated);
    }
    // HanoiHotel policy:
    // - deposit: customer may pay later (prepaid can be 0 at booking creation)
    // - full: allow paying later via payment gateway (prepaid can be 0); if prepaid > 0 then it must equal estimated
    if (payment_mode === "full") {
      if (prepaid > 0 && Math.abs(prepaid - estimated) > 1) {
        return res.status(400).json({
          message: `Full payment must equal estimated room total ${estimated} VND (or 0 to pay later)`,
        });
      }
      if (prepaid > estimated) {
        return res.status(400).json({ message: "Full payment cannot exceed estimated room total" });
      }
    } else if (payment_mode === "deposit") {
      // deposit may be paid later (prepaid can be 0 at booking creation)
      if (prepaid > 0 && prepaid + 1 < depositAmount) {
        return res.status(400).json({
          message: `Deposit must be >= required deposit ${depositAmount} VND (or 0 to pay later)`,
        });
      }
      if (prepaid > estimated) {
        return res.status(400).json({ message: "Deposit cannot exceed estimated room total" });
      }
    }

    const depositPaidAmount = Math.min(depositAmount, prepaid);
    const depositOk =
      payment_mode === "full"
        ? prepaid + 1 >= estimated
        : isDepositSufficient({ depositAmount, depositPaidAmount });

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
      booking_type: bookingType,
      room_quantity: totalQty,
      payment_mode,
      prepaid_amount: prepaid,
      deposit_amount: depositAmount,
      deposit_paid_amount: depositPaidAmount,
      deposit_status: depositOk ? "paid" : "unpaid",
      estimated_room_total: estimated,
      discount_code_id: discountCodeId,
      discount_code: discountCode,
      discount_amount: discountAmount,
      total_price: estimated,
      service_fee: 0,
      services: [],
      is_paid: payment_mode === "full" ? prepaid + 1 >= estimated : false,
      // After customer pays (deposit/full), booking still stays pending until admin confirms.
      status: "pending",
      assigned_room_ids: [],
    });

    const populated = await Booking.findById(booking._id)
      .populate("room_type_id", "name price description")
      .populate("line_items.room_type_id", "name price description maxGuests")
      .lean();

    if (discountCodeId) {
      await DiscountCode.findByIdAndUpdate(discountCodeId, { $inc: { used_count: 1 } });
    }

    return res.status(201).json({
      message: "Đặt phòng thành công",
      booking: attachCanReview(populated),
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

/**
 * Public availability checker for booking screen.
 * GET /api/bookings/availability?check_in_date=...&check_out_date=...&booking_type=overnight
 * Optional query: line_items (JSON), room_type_ids (comma-separated), room_type_id, quantity
 */
export const checkBookingAvailability = async (req, res) => {
  try {
    const bookingType = String(req.query.booking_type || "overnight")
      .trim()
      .toLowerCase();
    if (bookingType !== "overnight") {
      return res.status(400).json({ message: "Hệ thống hiện chỉ hỗ trợ đặt theo đêm" });
    }

    const checkInRaw = req.query.check_in_date;
    const checkOutRaw = req.query.check_out_date;

    let start;
    let end;

    const parsed = parseStayDates(checkInRaw, checkOutRaw);
    if (parsed.error) {
      return res.status(400).json({ message: parsed.error });
    }
    start = parsed.start;
    end = parsed.end;

    const requestedMap = new Map();
    const lineItemsRaw = req.query.line_items;
    if (lineItemsRaw) {
      let parsedItems;
      try {
        parsedItems = JSON.parse(String(lineItemsRaw));
      } catch (_err) {
        return res.status(400).json({ message: "line_items phải là JSON hợp lệ" });
      }
      if (Array.isArray(parsedItems)) {
        for (const row of parsedItems) {
          const tid = row?.room_type_id ?? row?.roomType;
          if (!mongoose.isValidObjectId(tid)) continue;
          const qty = Math.max(1, Number.parseInt(String(row?.quantity), 10) || 1);
          const key = String(tid);
          requestedMap.set(key, (requestedMap.get(key) || 0) + qty);
        }
      }
    }

    if (requestedMap.size === 0) {
      const singleRoomType = req.query.room_type_id;
      if (singleRoomType && mongoose.isValidObjectId(singleRoomType)) {
        const qty = Math.max(1, Number.parseInt(String(req.query.quantity), 10) || 1);
        requestedMap.set(String(singleRoomType), qty);
      }
    }

    if (requestedMap.size === 0) {
      const roomTypeIds = String(req.query.room_type_ids || "")
        .split(",")
        .map((x) => x.trim())
        .filter((x) => mongoose.isValidObjectId(x));
      for (const tid of roomTypeIds) {
        requestedMap.set(String(tid), 1);
      }
    }

    if (requestedMap.size === 0) {
      return res.status(400).json({
        message: "Cần room_type_id, room_type_ids hoặc line_items để kiểm tra phòng trống",
      });
    }

    const results = [];
    for (const [roomTypeId, requested] of requestedMap.entries()) {
      const roomTypeDoc = await RoomType.findById(roomTypeId).select("name code").lean();
      if (!roomTypeDoc) {
        results.push({
          room_type_id: roomTypeId,
          room_type_name: "",
          requested,
          physical: 0,
          reserved: 0,
          available: 0,
          is_enough: false,
          message: "Không tìm thấy loại phòng",
        });
        continue;
      }
      const physical = await countBookablePhysicalRoomsByType(roomTypeId);
      const reserved = await sumReservedSlotsForRoomType(roomTypeId, start, end, null);
      const available = Math.max(0, physical - reserved);
      const isEnough = available >= requested;

      results.push({
        room_type_id: roomTypeId,
        room_type_name: roomTypeDoc.name || "",
        room_type_code: roomTypeDoc.code || "",
        requested,
        physical,
        reserved,
        available,
        is_enough: isEnough,
        message: isEnough
          ? "Còn phòng"
          : `Không đủ phòng trống (cần ${requested}, còn ${available})`,
      });
    }

    return res.json({
      booking_type: bookingType,
      check_in_date: start,
      check_out_date: end,
      ok: results.every((r) => r.is_enough),
      items: results,
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
    const {
      guest_name,
      guest_phone,
      guest_id_number,
      assigned_room_ids,
      override_time_window,
      guest_email,
      guest_address,
      guest_nationality,
      guest_dob,
      guest_note,
      party_guests,
    } =
      req.body || {};

    const booking = await Booking.findById(req.params.id);
    if (!booking) {
      return res.status(404).json({ message: "Không tìm thấy booking" });
    }
    if (booking.status !== "confirmed") {
      return res.status(400).json({
        message: "Check-in only when booking status is confirmed",
      });
    }

    const now = new Date();
    const allowOverride = Boolean(override_time_window);
    const checkInDate = new Date(booking.check_in_date);
    // Policy: check-in 14:00–19:00 on arrival day
    if (
      !allowOverride &&
      (!isSameLocalDate(now, checkInDate) || !withinLocalTimeWindow(now, { startHour: 14, endHour: 19 }))
    ) {
      return res.status(400).json({
        message: "Chỉ được check-in từ 14:00 đến 19:00 vào ngày đến (hoặc dùng override_time_window=true).",
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
    if (guest_email) {
      booking.guest_email = String(guest_email || "").trim().toLowerCase();
    }
    booking.assigned_room_ids = ids;
    booking.status = "checked_in";
    booking.actual_check_in_at = now;
    booking.checked_in_by = req.userId || null;
    booking.checkin_guest_snapshot = {
      name: gName,
      phone: gPhone,
      email: String(booking.guest_email || "").trim().toLowerCase(),
      id_number: gId,
      address: guest_address ? String(guest_address || "").trim() : "",
      nationality: guest_nationality ? String(guest_nationality || "").trim() : "",
      dob: guest_dob ? String(guest_dob || "").trim() : "",
      note: guest_note ? String(guest_note || "").trim() : "",
      checked_in_at: now.toISOString(),
      checked_in_by: req.userId || null,
    };

    // VN requirement: store full guest roster for the stay.
    const roster = Array.isArray(party_guests) ? party_guests : [];
    const normalizedRoster = roster
      .map((g) => ({
        full_name: String(g?.full_name || "").trim(),
        id_card: String(g?.id_card || "").trim(),
        nationality: String(g?.nationality || "").trim(),
        relationship: String(g?.relationship || "").trim(),
        date_of_birth: g?.date_of_birth ? new Date(g.date_of_birth) : null,
        is_primary: Boolean(g?.is_primary),
      }))
      .filter((g) => g.full_name);

    // Ensure primary guest exists in roster
    const hasPrimary = normalizedRoster.some((g) => g.is_primary);
    const ensurePrimary = {
      full_name: gName,
      id_card: gId,
      nationality: booking.checkin_guest_snapshot.nationality || "",
      relationship: "primary",
      date_of_birth: booking.checkin_guest_snapshot.dob ? new Date(booking.checkin_guest_snapshot.dob) : null,
      is_primary: true,
    };
    const finalRoster = hasPrimary ? normalizedRoster : [ensurePrimary, ...normalizedRoster];

    // Persist roster snapshot to separate collection (replace existing roster for this booking)
    await BookingGuest.deleteMany({ booking_id: booking._id });
    if (finalRoster.length > 0) {
      await BookingGuest.insertMany(
        finalRoster.map((g) => ({
          booking_id: booking._id,
          full_name: g.full_name,
          id_card: g.id_card,
          nationality: g.nationality,
          date_of_birth: g.date_of_birth && !Number.isNaN(g.date_of_birth.getTime()) ? g.date_of_birth : null,
          relationship: g.relationship,
          is_primary: Boolean(g.is_primary),
          captured_at: now,
          captured_by: req.userId || null,
        })),
      );
    }

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
    const { payment_method = "cash", settle_balance = true, override_time_window } = req.body || {};

    const booking = await Booking.findById(req.params.id);
    if (!booking) {
      return res.status(404).json({ message: "Không tìm thấy booking" });
    }
    if (booking.status !== "checked_in") {
      return res.status(400).json({
        message: "Check-out only when status is checked_in",
      });
    }
    const now = new Date();
    const allowOverride = Boolean(override_time_window);
    const checkOutDate = new Date(booking.check_out_date);
    // Policy: check-out before 12:00 on departure day
    if (
      !allowOverride &&
      (!isSameLocalDate(now, checkOutDate) || !withinLocalTimeWindow(now, { startHour: 0, endHour: 12 }))
    ) {
      return res.status(400).json({
        message: "Chỉ được check-out trước 12:00 vào ngày đi (hoặc dùng override_time_window=true).",
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
    const bookingDiscount = Math.max(0, Number(booking.discount_amount) || 0);
    const discountedGrand = Math.max(0, grand - bookingDiscount);
    const prepaid = Math.max(0, Number(booking.prepaid_amount) || 0);
    const balanceDue = Math.max(0, discountedGrand - prepaid);

    const invNumber = `INV-${Date.now()}-${String(booking._id).slice(-6).toUpperCase()}`;

    const invoice = await Invoice.create({
      booking_id: booking._id,
      invoice_number: invNumber,
      room_subtotal: roomSubtotal,
      service_subtotal: serviceSubtotal,
      discount_amount: bookingDiscount,
      grand_total: discountedGrand,
      prepaid_amount: prepaid,
      balance_due: balanceDue,
      status: settle_balance ? "paid" : "unpaid",
      paid_at: settle_balance ? new Date() : null,
      payment_method: String(payment_method || "cash"),
    });

    booking.invoice_id = invoice._id;
    booking.total_price = discountedGrand;
    booking.status = OUT_COMPLETED;
    booking.is_paid = Boolean(settle_balance);
    booking.actual_check_out_at = now;
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
      message: `Booking #${String(booking._id).slice(-6).toUpperCase()} checked out. Total: ${discountedGrand} VND.`,
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

/**
 * Admin confirm: only allowed when deposit is fully paid.
 * PUT /api/bookings/:id/confirm
 */
export const confirmBooking = async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id);
    if (!booking) return res.status(404).json({ message: "Không tìm thấy booking" });

    const terminal = [OUT_COMPLETED, LEGACY_COMPLETED, "cancelled"];
    if (terminal.includes(booking.status)) {
      return res.status(400).json({ message: "Booking đã kết thúc hoặc bị hủy" });
    }

    if (booking.status !== "pending") {
      return res.status(400).json({ message: "Chỉ có thể xác nhận khi booking đang ở trạng thái pending" });
    }

    // Validate guest info (must exist from booking step)
    const gName = String(booking.guest_name || "").trim();
    const gPhone = String(booking.guest_phone || "").trim();
    const gEmail = String(booking.guest_email || "").trim();
    if (!gName || !gPhone || !gEmail) {
      return res.status(400).json({
        message: "Thông tin khách chưa đầy đủ (guest_name/guest_phone/guest_email)",
      });
    }

    if (!isDepositSufficient({ depositAmount: booking.deposit_amount, depositPaidAmount: booking.deposit_paid_amount })) {
      return res.status(400).json({
        message: "Chưa thanh toán đủ tiền cọc; không thể xác nhận booking",
      });
    }

    // Check availability again at confirm time (avoid overbooking when multiple pending exist)
    const start = new Date(booking.check_in_date);
    const end = new Date(booking.check_out_date);
    const lineItems = Array.isArray(booking.line_items) ? booking.line_items : [];
    if (lineItems.length > 0) {
      for (const li of lineItems) {
        const rtid = li.room_type_id;
        const qty = Math.max(1, Number(li.quantity) || 1);
        const physical = await countBookablePhysicalRoomsByType(rtid);
        const reserved = await sumReservedSlotsForRoomType(rtid, start, end, booking._id);
        if (reserved + qty > physical) {
          return res.status(409).json({
            message: "Không còn đủ phòng trống cho loại phòng trong khoảng ngày đã chọn",
          });
        }
      }
    } else if (booking.room_type_id) {
      const physical = await countBookablePhysicalRoomsByType(booking.room_type_id);
      const reserved = await sumReservedSlotsForRoomType(booking.room_type_id, start, end, booking._id);
      const qty = Math.max(1, Number(booking.room_quantity) || 1);
      if (reserved + qty > physical) {
        return res.status(409).json({
          message: "Không còn đủ phòng trống cho loại phòng trong khoảng ngày đã chọn",
        });
      }
    }

    booking.deposit_status = "paid";
    booking.status = "confirmed";
    await booking.save();

    await createNotification({
      userId: booking.user_id,
      bookingId: booking._id,
      type: "booking_confirmed",
      title: "Booking đã được xác nhận",
      message: `Booking #${String(booking._id).slice(-6).toUpperCase()} đã được xác nhận sau khi nhận đủ tiền cọc.`,
      eventKey: `booking_confirmed_${booking._id}`,
    });

    return res.json({ message: "Xác nhận booking thành công", booking: attachCanReview(booking.toObject()) });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

async function createUnpaidInvoiceForBooking(booking, { payment_method = "unpaid_policy", note = "" } = {}) {
  const roomSubtotal = Math.max(0, Number(booking.estimated_room_total) || 0);
  const serviceSubtotal = 0;
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
    status: "unpaid",
    paid_at: null,
    payment_method: String(payment_method || "unpaid_policy"),
  });
  return { invoice, note };
}

export const cancelBooking = async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id);
    if (!booking) {
      return res.status(404).json({ message: "Không tìm thấy booking" });
    }
    const actor = await User.findById(req.userId).select("role").lean();
    const isOwner = String(booking.user_id || "") === String(req.userId || "");
    const isAdmin = String(actor?.role || "").toLowerCase() === "admin";
    if (!isOwner && !isAdmin) {
      return res.status(403).json({ message: "Bạn không có quyền hủy booking này" });
    }
    const st = mapStatusForApi(booking.status);
    if (st === "checked_in" || st === OUT_COMPLETED) {
      return res.status(400).json({
        message: "Cannot cancel after check-in or check-out",
      });
    }
    if (!isAdmin && !["pending", "confirmed"].includes(st)) {
      return res.status(400).json({ message: "Bạn chỉ có thể hủy booking đang chờ xác nhận hoặc đã xác nhận" });
    }
    if (st === "cancelled") {
      return res.status(400).json({ message: "Booking đã được hủy trước đó" });
    }

    const now = new Date();
    const hoursUntil = computeHoursUntilArrival(now, booking.check_in_date);
    const refundAmount = computeRefundAmount({
      depositPaidAmount: booking.deposit_paid_amount,
      hoursUntilArrival: hoursUntil,
      ratePlanKey: resolveBookingRatePlanKey(booking),
    });

    // Apply cancellation policy. Refund > 0 will be pending for admin approval.
    const paidDeposit = Math.max(0, Number(booking.deposit_paid_amount) || 0);
    if (refundAmount > 0) {
      booking.deposit_status = "pending_refund";
      booking.refund_requested_amount = refundAmount;
      booking.refund_requested_at = now;
      booking.refund_status = "requested";
      booking.refund_requested_by = req.userId || null;
      booking.refund_processed_at = null;
      booking.refund_processed_amount = 0;
      booking.refund_rejected_reason = "";
      booking.refund_approved_by = null;
      booking.refund_rejected_by = null;
      booking.refund_approved_at = null;
      booking.refund_rejected_at = null;
    } else if (paidDeposit > 0) {
      // <=48h or no-show: forfeit deposit
      booking.deposit_status = "forfeited";
      booking.refund_requested_amount = 0;
      booking.refund_requested_at = null;
      booking.refund_processed_at = now;
      booking.refund_processed_amount = 0;
      booking.refund_status = "none";
    }

    booking.status = "cancelled";
    booking.cancelled_at = now;
    booking.cancel_reason = String(req.body?.reason || "").trim();
    const prev = [...(booking.assigned_room_ids || [])];
    if (booking.assigned_room_id) prev.push(booking.assigned_room_id);
    booking.assigned_room_ids = [];
    booking.assigned_room_id = null;

    // <=48h cancellation requires full booking amount due; create unpaid invoice if needed
    if (hoursUntil != null && hoursUntil <= 48) {
      if (!booking.invoice_id) {
        const { invoice } = await createUnpaidInvoiceForBooking(booking, {
          payment_method: "policy_cancellation",
          note: "<=48h cancellation: full booking amount due",
        });
        booking.invoice_id = invoice._id;
        booking.total_price = Math.max(0, Number(invoice.grand_total) || booking.total_price || 0);
      }
    }

    await booking.save();
    for (const p of prev) {
      await syncRoomStatus(p);
    }
    try {
      await createNotification({
        userId: booking.user_id,
        bookingId: booking._id,
        type: "booking_cancelled",
        title: "Booking đã hủy",
        message:
          refundAmount > 0
            ? `Booking #${String(booking._id).slice(-6).toUpperCase()} đã hủy. Yêu cầu hoàn ${formatCurrencyVND(refundAmount)} đang chờ xử lý.`
            : `Booking #${String(booking._id).slice(-6).toUpperCase()} đã hủy theo chính sách.`,
        eventKey: `booking_cancelled_${booking._id}`,
      });
      if (booking.guest_email) {
        await sendRefundStatusEmail({
          to: booking.guest_email,
          guestName: booking.guest_name || "",
          bookingId: booking._id,
          stage: refundAmount > 0 ? "pending_refund" : "forfeited",
          amount: refundAmount,
          reason: booking.cancel_reason,
        });
      }
    } catch {
      // Non-blocking notification/email.
    }
    return res.json({ message: "Booking cancelled", booking });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

/**
 * Admin mark no-show: forfeit deposit and create unpaid invoice for full room amount.
 * PUT /api/bookings/:id/no-show
 */
export const markNoShowBooking = async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id);
    if (!booking) return res.status(404).json({ message: "Không tìm thấy booking" });
    const st = mapStatusForApi(booking.status);
    if (st !== "confirmed") {
      return res.status(400).json({ message: "No-show chỉ áp dụng khi booking đã confirmed" });
    }
    if (booking.invoice_id) {
      return res.status(400).json({ message: "Booking đã có hóa đơn" });
    }

    booking.no_show_at = new Date();
    booking.deposit_status = Math.max(0, Number(booking.deposit_paid_amount) || 0) > 0 ? "forfeited" : booking.deposit_status;
    booking.status = "cancelled";
    booking.cancelled_at = booking.no_show_at;
    booking.cancel_reason = "no_show";

    const { invoice } = await createUnpaidInvoiceForBooking(booking, {
      payment_method: "policy_no_show",
      note: "No-show: full booking amount due",
    });
    booking.invoice_id = invoice._id;
    booking.total_price = Math.max(0, Number(invoice.grand_total) || booking.total_price || 0);
    await booking.save();

    await createNotification({
      userId: booking.user_id,
      bookingId: booking._id,
      type: "no_show",
      title: "No-show",
      message: `Booking #${String(booking._id).slice(-6).toUpperCase()} được đánh dấu no-show. Tiền cọc bị giữ lại theo chính sách.`,
      eventKey: `no_show_${booking._id}`,
    });

    return res.json({ message: "Đã đánh dấu no-show", booking, invoice });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

/** PUT /api/bookings/:id/confirm-refund — admin only */
export const confirmRefundBooking = async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id);
    if (!booking) return res.status(404).json({ message: "Không tìm thấy booking" });
    if (String(booking.deposit_status) !== "pending_refund") {
      return res.status(400).json({ message: "Booking không ở trạng thái chờ hoàn tiền" });
    }

    const now = new Date();
    const hoursUntil = computeHoursUntilArrival(now, booking.check_in_date);
    const refundAmount = computeRefundAmount({
      depositPaidAmount: booking.deposit_paid_amount,
      hoursUntilArrival: hoursUntil,
      ratePlanKey: resolveBookingRatePlanKey(booking),
    });
    const requestedAmount = Math.max(0, Number(booking.refund_requested_amount) || 0);
    const refundToProcess = requestedAmount > 0 ? requestedAmount : refundAmount;
    if (refundToProcess <= 0) {
      booking.deposit_status = "forfeited";
      await booking.save();
      return res.status(400).json({ message: "Số tiền hoàn không hợp lệ, booking đã bị chuyển forfeited" });
    }

    const paidDeposit = Math.max(0, Number(booking.deposit_paid_amount) || 0);
    booking.deposit_paid_amount = Math.max(0, paidDeposit - refundToProcess);
    booking.prepaid_amount = Math.max(
      0,
      Math.max(0, Number(booking.prepaid_amount) || 0) - refundToProcess,
    );
    booking.deposit_status = refundToProcess + 1 >= paidDeposit ? "refunded" : "partial_refunded";
    booking.refund_status = "paid";
    booking.refund_processed_amount = refundToProcess;
    booking.refund_processed_at = now;
    booking.refund_approved_by = req.userId || null;
    booking.refund_approved_at = now;
    booking.refund_rejected_by = null;
    booking.refund_rejected_at = null;
    booking.refund_rejected_reason = "";
    await booking.save();

    await PaymentTransaction.create({
      booking_id: booking._id,
      provider: "momo",
      type: "refund",
      amount: refundToProcess,
      status: "refunded",
      provider_order_id: `REFUND_${booking._id}_${Date.now()}`,
      provider_message: "Refund approved by admin",
      provider_payload: { approvedBy: req.userId },
    });

    await createNotification({
      userId: booking.user_id,
      bookingId: booking._id,
      type: "refund_result",
      title: "Hoàn tiền thành công",
      message: `Booking #${String(booking._id).slice(-6).toUpperCase()} đã được hoàn ${formatCurrencyVND(refundToProcess)}.`,
      eventKey: `refund_result_${booking._id}`,
    });
    try {
      if (booking.guest_email) {
        await sendRefundStatusEmail({
          to: booking.guest_email,
          guestName: booking.guest_name || "",
          bookingId: booking._id,
          stage: "refunded",
          amount: refundToProcess,
        });
      }
    } catch {
      // Non-blocking email
    }

    return res.json({ message: "Đã xác nhận hoàn tiền", booking, refundAmount: refundToProcess });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

/** PUT /api/bookings/:id/reject-refund — admin only */
export const rejectRefundBooking = async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id);
    if (!booking) return res.status(404).json({ message: "Không tìm thấy booking" });
    if (String(booking.deposit_status) !== "pending_refund") {
      return res.status(400).json({ message: "Booking không ở trạng thái chờ hoàn tiền" });
    }

    const reason = String(req.body?.reason || "").trim();
    booking.deposit_status = "forfeited";
    booking.refund_status = "rejected";
    booking.refund_processed_amount = 0;
    booking.refund_processed_at = new Date();
    booking.refund_rejected_by = req.userId || null;
    booking.refund_rejected_at = booking.refund_processed_at;
    booking.refund_approved_by = null;
    booking.refund_approved_at = null;
    booking.refund_rejected_reason = reason;
    booking.cancel_reason = reason
      ? `${String(booking.cancel_reason || "").trim()} | refund_reject: ${reason}`.trim()
      : booking.cancel_reason;
    await booking.save();

    await createNotification({
      userId: booking.user_id,
      bookingId: booking._id,
      type: "refund_result",
      title: "Yêu cầu hoàn tiền bị từ chối",
      message: `Booking #${String(booking._id).slice(-6).toUpperCase()} không đủ điều kiện hoàn tiền.`,
      eventKey: `refund_result_${booking._id}`,
    });
    try {
      if (booking.guest_email) {
        await sendRefundStatusEmail({
          to: booking.guest_email,
          guestName: booking.guest_name || "",
          bookingId: booking._id,
          stage: "rejected",
          reason,
        });
      }
    } catch {
      // Non-blocking email
    }

    return res.json({ message: "Đã từ chối hoàn tiền", booking });
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
    const bookingDiscount = Math.max(0, Number(booking.discount_amount) || 0);
    const grand = Math.max(0, roomSubtotal + serviceSubtotal - bookingDiscount);
    const prepaid = Math.max(0, Number(booking.prepaid_amount) || 0);
    return res.json({
      room_subtotal: roomSubtotal,
      service_subtotal: serviceSubtotal,
      discount_amount: bookingDiscount,
      grand_total: grand,
      prepaid_amount: prepaid,
      balance_due: Math.max(0, grand - prepaid),
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

/** GET /api/bookings/:id/folio — owner or admin: realtime totals + lines */
export const getBookingFolio = async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id)
      .populate("user_id", "name email role")
      .populate("line_items.room_type_id", "name price")
      .populate("room_type_id", "name price")
      .lean();
    if (!booking) {
      return res.status(404).json({ message: "Không tìm thấy booking" });
    }

    const ownerId = booking.user_id?._id ?? booking.user_id;
    const isOwner = String(ownerId) === String(req.userId);
    if (!isOwner) {
      const u = await User.findById(req.userId).select("role").lean();
      if (!u || u.role !== "admin") {
        return res.status(403).json({ message: "Không có quyền xem folio này" });
      }
    }

    let roomSubtotal = 0;
    const liBooking = Array.isArray(booking.line_items) ? booking.line_items : [];
    if (liBooking.length > 0) {
      roomSubtotal = liBooking.reduce((s, li) => s + Number(li.line_subtotal || 0), 0);
      if (roomSubtotal <= 0) {
        // fallback compute from roomType.price if needed
        const n = nightsBetween(new Date(booking.check_in_date), new Date(booking.check_out_date));
        roomSubtotal = liBooking.reduce((s, li) => {
          const unit = Number(li?.room_type_id?.price || 0);
          const q = Math.max(1, Number(li.quantity) || 1);
          return s + computeRoomSubtotal(unit, n, q);
        }, 0);
      }
    } else {
      const roomType = await loadRoomTypeForBooking(booking);
      if (roomType?.price) {
        const n = nightsBetween(new Date(booking.check_in_date), new Date(booking.check_out_date));
        roomSubtotal = computeRoomSubtotal(roomType.price, n, booking.room_quantity);
      }
    }

    const serviceLines = await BookingService.find({ booking_id: booking._id })
      .populate("service_id", "name category defaultPrice")
      .sort({ createdAt: -1 })
      .lean();
    const serviceSubtotal = serviceLines.reduce((s, l) => s + Number(l.line_total || 0), 0);

    const charges = await BookingCharge.find({ booking_id: booking._id })
      .populate("charged_by", "name email")
      .sort({ charged_at: -1, createdAt: -1 })
      .lean();
    const chargeSubtotal = charges.reduce((s, c) => s + Number(c.total_price || 0), 0);

    const extrasTotal = Math.max(0, serviceSubtotal) + Math.max(0, chargeSubtotal);
    const bookingDiscount = Math.max(0, Number(booking.discount_amount) || 0);
    const grand = Math.max(0, Math.max(0, roomSubtotal) + extrasTotal - bookingDiscount);
    const prepaid = Math.max(0, Number(booking.prepaid_amount) || 0);
    const depositPaid = Math.max(0, Number(booking.deposit_paid_amount) || 0);
    const depositRequired = Math.max(0, Number(booking.deposit_amount) || 0);
    const balanceDue = Math.max(0, grand - prepaid);

    return res.json({
      booking_id: booking._id,
      status: mapStatusForApi(booking.status),
      check_in_date: booking.check_in_date,
      check_out_date: booking.check_out_date,
      room_subtotal: Math.max(0, roomSubtotal),
      service_subtotal: extrasTotal,
      discount_amount: bookingDiscount,
      grand_total: grand,
      prepaid_amount: prepaid,
      deposit_paid_amount: depositPaid,
      deposit_amount: depositRequired,
      balance_due: balanceDue,
      service_lines: serviceLines,
      charges,
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

/** GET /api/bookings/:id/guests — admin or owner */
export const getBookingGuests = async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id).select("user_id").lean();
    if (!booking) return res.status(404).json({ message: "Không tìm thấy booking" });
    const ownerId = booking.user_id?._id ?? booking.user_id;
    const isOwner = String(ownerId) === String(req.userId);
    if (!isOwner) {
      const u = await User.findById(req.userId).select("role").lean();
      if (!u || u.role !== "admin") return res.status(403).json({ message: "Không có quyền" });
    }
    const guests = await BookingGuest.find({ booking_id: req.params.id })
      .sort({ is_primary: -1, createdAt: 1 })
      .lean();
    return res.json({ items: guests });
  } catch (e) {
    return res.status(500).json({ message: e.message });
  }
};

/** GET /api/bookings/:id/charges — admin or owner */
export const getBookingCharges = async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id).select("user_id").lean();
    if (!booking) return res.status(404).json({ message: "Không tìm thấy booking" });
    const ownerId = booking.user_id?._id ?? booking.user_id;
    const isOwner = String(ownerId) === String(req.userId);
    if (!isOwner) {
      const u = await User.findById(req.userId).select("role").lean();
      if (!u || u.role !== "admin") return res.status(403).json({ message: "Không có quyền" });
    }
    const items = await BookingCharge.find({ booking_id: req.params.id })
      .populate("charged_by", "name email")
      .sort({ charged_at: -1, createdAt: -1 })
      .lean();
    return res.json({ items });
  } catch (e) {
    return res.status(500).json({ message: e.message });
  }
};

/** POST /api/bookings/:id/charges — admin-only */
export const addBookingCharge = async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id).select("status").lean();
    if (!booking) return res.status(404).json({ message: "Không tìm thấy booking" });
    if (mapStatusForApi(booking.status) !== "checked_in") {
      return res.status(400).json({ message: "Chỉ được thêm phát sinh khi booking đang checked_in" });
    }
    const {
      service_name,
      category = "other",
      quantity = 1,
      unit_price = 0,
      charged_at,
      note = "",
    } = req.body || {};
    const name = String(service_name || "").trim();
    if (!name) return res.status(400).json({ message: "service_name là bắt buộc" });
    const qty = Math.max(1, Number.parseInt(String(quantity), 10) || 1);
    const unit = Math.max(0, Number(unit_price) || 0);
    const at = charged_at ? new Date(charged_at) : new Date();
    if (Number.isNaN(at.getTime())) return res.status(400).json({ message: "charged_at không hợp lệ" });
    const doc = await BookingCharge.create({
      booking_id: req.params.id,
      service_name: name,
      category: String(category || "other"),
      quantity: qty,
      unit_price: unit,
      charged_at: at,
      charged_by: req.userId || null,
      note: String(note || "").trim(),
    });
    const populated = await BookingCharge.findById(doc._id)
      .populate("charged_by", "name email")
      .lean();
    return res.status(201).json({ charge: populated });
  } catch (e) {
    return res.status(500).json({ message: e.message });
  }
};

/** PUT /api/bookings/:id/guests — admin-only: replace roster while confirmed/checked_in */
export const replaceBookingGuests = async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id).select("status guest_name guest_id_number guest_email").lean();
    if (!booking) return res.status(404).json({ message: "Không tìm thấy booking" });
    const st = mapStatusForApi(booking.status);
    if (!["confirmed", "checked_in"].includes(st)) {
      return res.status(400).json({ message: "Chỉ cập nhật đoàn khách khi booking đang confirmed hoặc checked_in" });
    }
    const roster = Array.isArray(req.body?.party_guests) ? req.body.party_guests : [];
    const normalizedRoster = roster
      .map((g) => ({
        full_name: String(g?.full_name || "").trim(),
        id_card: String(g?.id_card || "").trim(),
        nationality: String(g?.nationality || "").trim(),
        relationship: String(g?.relationship || "").trim(),
        date_of_birth: g?.date_of_birth ? new Date(g.date_of_birth) : null,
        is_primary: Boolean(g?.is_primary),
      }))
      .filter((g) => g.full_name);

    if (normalizedRoster.length === 0) {
      return res.status(400).json({ message: "party_guests rỗng" });
    }

    const hasPrimary = normalizedRoster.some((g) => g.is_primary);
    const ensurePrimary = {
      full_name: String(booking.guest_name || "").trim() || normalizedRoster[0].full_name,
      id_card: String(booking.guest_id_number || booking.guest_id_number || "").trim(),
      nationality: "",
      relationship: "primary",
      date_of_birth: null,
      is_primary: true,
    };
    const finalRoster = hasPrimary ? normalizedRoster : [ensurePrimary, ...normalizedRoster];

    await BookingGuest.deleteMany({ booking_id: req.params.id });
    await BookingGuest.insertMany(
      finalRoster.map((g) => ({
        booking_id: req.params.id,
        full_name: g.full_name,
        id_card: g.id_card,
        nationality: g.nationality,
        date_of_birth: g.date_of_birth && !Number.isNaN(g.date_of_birth.getTime()) ? g.date_of_birth : null,
        relationship: g.relationship,
        is_primary: Boolean(g.is_primary),
        captured_at: new Date(),
        captured_by: req.userId || null,
      })),
    );

    const guests = await BookingGuest.find({ booking_id: req.params.id })
      .sort({ is_primary: -1, createdAt: 1 })
      .lean();
    return res.json({ message: "Đã cập nhật đoàn khách", items: guests });
  } catch (e) {
    return res.status(500).json({ message: e.message });
  }
};
