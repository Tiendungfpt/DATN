import mongoose from "mongoose";
import Booking from "../models/Booking.js";
import Refund from "../models/Refund.js";
import PaymentTransaction from "../models/PaymentTransaction.js";
import Rooms from "../models/rooms.js";
import User from "../models/User.js";
import { ROOM_OCCUPYING_BOOKING_STATUSES } from "../utils/bookingSchedule.js";
import { computeRefundBreakdown } from "../utils/refundPolicy.js";
import { createNotification } from "../utils/notification.js";
import { sendRefundStatusEmail } from "../services/emailService.js";

/**
 * Sau khi hủy/gỡ phòng gán — đồng bộ occupied/available như trong booking cancel.
 *
 * @param {unknown} roomIdOrList
 */
async function syncRoomStatuses(roomIdOrList) {
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

/**
 * Ước tính số tiền đã thu của khách dùng làm căn cứ áp refund % policy.
 *
 * @param {import("../models/Booking.js").Booking} booking
 */
function resolveRefundOriginalAmount(booking) {
  const prepaid = Math.round(Math.max(0, Number(booking.prepaid_amount) || 0));
  const depositPaid = Math.round(Math.max(0, Number(booking.deposit_paid_amount) || 0));
  let base = prepaid;
  if (base <= 0) base = depositPaid;
  if (base <= 0 && booking.is_paid === true) {
    base = Math.round(Math.max(0, Number(booking.total_price) || 0));
  }
  return Math.max(0, base);
}

/** @typedef {{ refundAmount: number, cancellationFee: number, originalAmount: number }} BreakdownLike */

/**
 * Chuẩn hóa DTO camelCase — API mới của module refund.
 *
 * @param {unknown} raw
 */
function serializeRefund(raw) {
  const o =
    typeof raw?.toObject === "function"
      ? raw.toObject({ virtuals: false })
      : { .../** @type {Record<string, unknown>} */ (raw || {}) };

  const bookingIdResolved =
    o.booking_id && typeof o.booking_id === "object" && /** @type {{ _id?: unknown }} */ (o.booking_id)._id
      ? /** @type {{ _id: unknown }} */ (o.booking_id)._id
      : o.booking_id;

  const userIdResolved =
    o.user_id && typeof o.user_id === "object" && /** @type {{ _id?: unknown }} */ (o.user_id)._id
      ? /** @type {{ _id: unknown }} */ (o.user_id)._id
      : o.user_id;

  const out = {};
  Object.assign(out, {
    id: String(o._id || ""),
    bookingId: bookingIdResolved,
    userId: userIdResolved,
    amount: o.amount,
    originalAmount: o.original_amount,
    cancellationFee: o.cancellation_fee,
    reason: o.reason,
    status: o.status,
    paymentMethod: o.payment_method,
    refundTransactionId: o.refund_transaction_id,
    processedAt: o.processed_at,
    failureMessage: o.failure_message,
    createdAt: o.createdAt,
    updatedAt: o.updatedAt,
  });
  return out;
}

/**
 * Lấy thông tin cổng thanh toán từ ledger — map provider nội bộ sang nhánh refund.
 *
 * @param {import("../models/Booking.js").Booking} booking
 */
async function resolvePaymentLedgerMeta(booking) {
  const txn = await PaymentTransaction.findOne({
    booking_id: booking._id,
    status: "succeeded",
    type: { $in: ["deposit", "balance"] },
  })
    .sort({ updatedAt: -1 })
    .lean();

  if (!txn) {
    return { payment_method: booking.payment_provider || "", transId: booking.payment_transaction_id || "" };
  }

  /** @type {string} */
  let gateway = booking.payment_provider || "";
  const p = String(txn.provider || "").toLowerCase();
  if (!gateway && p === "momo") gateway = "momo";
  if (!gateway && p === "vnpay") gateway = "vnpay";

  const transId = String(txn.provider_trans_id || booking.payment_transaction_id || "").trim();
  return { payment_method: gateway || p || "", transId };
}

/** @typedef {{ ok: boolean, transId: string, err: string }} MockGatewayResult */

/**
 * Giả lập HTTP gateway hoàn tiền (latency + kết quả).
 *
 * @param {{ simulateFailure?: boolean }} opts
 */
function mockPaymentGatewayRefund(opts) {
  const simulateFailure = Boolean(opts.simulateFailure);
  return /** @type {Promise<MockGatewayResult>} */ (
    new Promise((resolve) => {
      setTimeout(() => {
        if (simulateFailure) {
          resolve({ ok: false, transId: "", err: "Cổng thanh toán từ chối hoàn tiền (demo)" });
          return;
        }
        resolve({ ok: true, transId: `MOCK_REF_${Date.now()}`, err: "" });
      }, 1000);
    })
  );
}

/**
 * Áp ledger khi gateway hoàn tiền thật/thành công (mirror confirm-refund legacy).
 *
 * @param {import("../models/Booking.js").Booking} booking
 * @param {number} amt
 */
async function applySuccessfulRefundLedger(booking, amt) {
  const refundToProcess = Math.max(0, Math.round(Number(amt) || 0));
  if (refundToProcess <= 0) return;

  const paidDeposit = Math.max(0, Number(booking.deposit_paid_amount) || 0);
  booking.deposit_paid_amount = Math.max(0, paidDeposit - refundToProcess);
  booking.prepaid_amount = Math.max(0, (Number(booking.prepaid_amount) || 0) - refundToProcess);
  booking.deposit_status =
    refundToProcess + 1 >= paidDeposit ? "refunded" : "partial_refunded";
  booking.refund_status = "paid";
  booking.refund_processed_amount = refundToProcess;
  booking.refund_processed_at = new Date();
  await booking.save();

  const providerGuess = booking.payment_provider || "momo";
  const refundProviderLedger =
    providerGuess === "momo" ? "momo" : providerGuess === "vnpay" ? "vnpay" : "bank";
  await PaymentTransaction.create({
    booking_id: booking._id,
    provider: refundProviderLedger,
    type: "refund",
    amount: refundToProcess,
    status: "refunded",
    provider_order_id: `REFUND_REQ_${booking._id}_${Date.now()}`,
    provider_trans_id: `LEDGER_${booking._id}_${Date.now()}`,
    provider_message: "Refund processed (mock gateway success)",
    provider_payload: { source: "refund_controller" },
  });
}

/** POST /api/refunds/request */
export async function requestRefund(req, res) {
  try {
    const bookingIdRaw = req.body?.bookingId;
    const reason = String(req.body?.reason || "").trim();

    if (!mongoose.Types.ObjectId.isValid(String(bookingIdRaw || ""))) {
      return res.status(400).json({ message: "bookingId không hợp lệ." });
    }
    if (!reason) {
      return res.status(400).json({ message: "Vui lòng nhập lý do hủy." });
    }

    const dup = await Refund.exists({
      booking_id: bookingIdRaw,
      status: { $in: ["pending", "processing"] },
    });
    if (dup) {
      return res.status(409).json({ message: "Booking này đã có yêu cầu hoàn tiền đang chờ xử lý." });
    }

    const booking = await Booking.findById(bookingIdRaw);
    if (!booking) {
      return res.status(404).json({ message: "Không tìm thấy booking." });
    }

    const isOwner = String(booking.user_id || "") === String(req.userId || "");
    if (!isOwner) {
      return res.status(403).json({ message: "Bạn không thể huỷ booking của người khác." });
    }

    if (booking.status !== "confirmed") {
      return res
        .status(400)
        .json({ message: "Chỉ áp dụng khi booking đã xác nhận (confirmed) và đã có thanh toán." });
    }

    const originalAmount = resolveRefundOriginalAmount(booking);
    if (originalAmount <= 0) {
      return res.status(400).json({ message: "Không có số tiền đã thanh toán để áp policy hoàn tiền." });
    }

    /** @type {BreakdownLike} — chính sách cố định: % theo calendar day tới check-in */
    const breakdown = computeRefundBreakdown(new Date(), booking.check_in_date, originalAmount);
    const ledgerMeta = await resolvePaymentLedgerMeta(booking);

    if (!booking.payment_transaction_id && ledgerMeta.transId) {
      booking.payment_transaction_id = ledgerMeta.transId;
    }

    /** @type {string} — giao dịch gốc: lưu trên booking + refund.payment_method */
    const paymentMethodStored = String(booking.payment_provider || ledgerMeta.payment_method || "momo").trim();

    const now = new Date();
    const prevRooms = [...(booking.assigned_room_ids || [])];
    if (booking.assigned_room_id) prevRooms.push(booking.assigned_room_id);

    if (breakdown.refundAmount > 0) {
      booking.deposit_status = "pending_refund";
      booking.refund_requested_amount = breakdown.refundAmount;
      booking.refund_requested_at = now;
      booking.refund_status = "requested";
      booking.refund_requested_by = req.userId || null;
      booking.refund_processed_at = null;
      booking.refund_processed_amount = 0;
      booking.refund_rejected_reason = "";
    } else {
      const paidDeposit = Math.max(0, Number(booking.deposit_paid_amount) || 0);
      booking.deposit_status = paidDeposit > 0 ? "forfeited" : booking.deposit_status;
      booking.refund_requested_amount = 0;
      booking.refund_requested_at = null;
      booking.refund_processed_at = now;
      booking.refund_processed_amount = 0;
      booking.refund_status = "none";
    }

    booking.status = "cancelled";
    booking.cancelled_at = now;
    booking.cancel_reason = reason;
    booking.assigned_room_ids = [];
    booking.assigned_room_id = null;

    await booking.save();

    const refundDoc = await Refund.create({
      booking_id: booking._id,
      user_id: req.userId,
      amount: breakdown.refundAmount,
      original_amount: breakdown.originalAmount,
      cancellation_fee: breakdown.cancellationFee,
      /** Luôn pending theo luồng chuẩn — chờ admin/mock gateway hoàn tất */
      status: "pending",
      payment_method: paymentMethodStored,
      processed_at: null,
      refund_transaction_id: "",
      failure_message: "",
    });

    for (const p of prevRooms) {
      await syncRoomStatuses(p);
    }

    try {
      await createNotification({
        userId: booking.user_id,
        bookingId: booking._id,
        type: "booking_cancelled",
        title: "Yêu cầu hủy & hoàn tiền",
        message:
          breakdown.refundAmount > 0
            ? `Booking #${String(booking._id).slice(-6).toUpperCase()} đã hủy. Hoàn ${breakdown.refundAmount.toLocaleString("vi-VN")} ₫ đang chờ xử lý (policy mới).`
            : `Booking #${String(booking._id).slice(-6).toUpperCase()} đã hủy — không được hoàn theo ngày còn lại.`,
        eventKey: `refund_requested_${booking._id}`,
      });
      if (booking.guest_email) {
        await sendRefundStatusEmail({
          to: booking.guest_email,
          guestName: booking.guest_name || "",
          bookingId: booking._id,
          stage: breakdown.refundAmount > 0 ? "pending_refund" : "forfeited",
          amount: breakdown.refundAmount,
          reason,
        });
      }
    } catch {
      /** non-blocking */
    }

    return res.status(201).json({
      message:
        breakdown.refundAmount > 0
          ? "Đã tạo yêu cầu hoàn tiền (đang chờ xử lý)."
          : "Đã ghi nhận yêu cầu hủy — số tiền hoàn 0% (chờ hệ thống hoàn tất bước xử lý).",
      refund: serializeRefund(refundDoc),
      policy: {
        cancellationFee: breakdown.cancellationFee,
        refundAmount: breakdown.refundAmount,
        originalAmount: breakdown.originalAmount,
      },
    });
  } catch (e) {
    return res.status(500).json({ message: e?.message || "Lỗi server khi tạo refund." });
  }
}

/** POST /api/refunds/process/:refundId — admin (mock gateway) */
export async function processRefund(req, res) {
  try {
    const id = String(req.params.refundId || "");
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "refundId không hợp lệ." });
    }

    const refund = await Refund.findById(id);
    if (!refund) {
      return res.status(404).json({ message: "Không tìm thấy refund." });
    }

    if (refund.status !== "pending") {
      return res.status(400).json({ message: "Chỉ xử lý refund trạng thái pending." });
    }

    refund.status = "processing";
    await refund.save();

    const simulateFailure = String(req.body?.simulateFailure || "") === "true";
    const mock = await mockPaymentGatewayRefund({ simulateFailure });

    const finishedAt = new Date();

    if (mock.ok) {
      refund.status = "success";
      refund.refund_transaction_id = mock.transId;
      refund.processed_at = finishedAt;
      refund.failure_message = "";
      await refund.save();

      const booking = await Booking.findById(refund.booking_id);
      if (booking) {
        const amt = Math.round(Number(refund.amount) || 0);
        if (amt > 0) {
          await applySuccessfulRefundLedger(booking, amt);
        } else {
          /** Hoàn 0₫ sau policy — đóng sổ bookkeeping, không gọi gateway trừ */
          booking.refund_status = "paid";
          booking.refund_processed_amount = 0;
          booking.refund_processed_at = finishedAt;
          await booking.save();
        }
      }

      return res.json({
        message: "Hoàn tiền thành công (giả lập gateway).",
        refund: serializeRefund(refund),
      });
    }

    refund.status = "failed";
    refund.processed_at = finishedAt;
    refund.failure_message = mock.err || "Refund thất bại";
    await refund.save();

    return res.status(502).json({
      message: "Gateway hoàn tiền báo lỗi.",
      refund: serializeRefund(refund),
    });
  } catch (e) {
    return res.status(500).json({ message: e?.message || "Lỗi server khi process refund." });
  }
}

/** GET /api/refunds/my */
export async function getMyRefunds(req, res) {
  try {
    const list = await Refund.find({ user_id: req.userId })
      .sort({ createdAt: -1 })
      .populate({
        path: "booking_id",
        select:
          "check_in_date check_out_date total_price guest_name line_items room_type_id status createdAt prepaid_amount deposit_paid_amount",
        populate: { path: "room_type_id", select: "name" },
      })
      .lean();

    const payload = list.map((row) => ({
      ...serializeRefund(row),
      booking: row.booking_id || null,
    }));

    return res.json({ items: payload });
  } catch (e) {
    return res.status(500).json({ message: e?.message || "Không đọc được danh sách refund." });
  }
}

/** GET /api/refunds/admin/list — quản trị duyệt mock */
export async function listRefundsAdmin(req, res) {
  try {
    const statusRaw = req.query.status ? String(req.query.status) : "";
    const filter =
      statusRaw === "all"
        ? {}
        : { status: { $in: ["pending", "processing", "failed"] } };

    const list = await Refund.find(filter)
      .sort({ createdAt: -1 })
      .limit(300)
      .populate({
        path: "booking_id",
        select: "guest_name guest_email check_in_date check_out_date total_price status user_id prepaid_amount deposit_paid_amount",
      })
      .populate({ path: "user_id", select: "name email" })
      .lean();

    return res.json({
      items: list.map((row) => ({
        ...serializeRefund(row),
        booking: row.booking_id || null,
        requestUser: row.user_id || null,
      })),
    });
  } catch (e) {
    return res.status(500).json({ message: e?.message || "Không đọc được refunds admin." });
  }
}

/** GET /api/refunds/:refundId */
export async function getRefundDetail(req, res) {
  try {
    const id = String(req.params.refundId || "");
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "refundId không hợp lệ." });
    }

    const row = await Refund.findById(id)
      .populate({
        path: "booking_id",
        select:
          "check_in_date check_out_date total_price guest_name guest_email line_items room_type_id status prepaid_amount deposit_paid_amount",
        populate: { path: "room_type_id", select: "name" },
      })
      .lean();

    if (!row) {
      return res.status(404).json({ message: "Không tìm thấy refund." });
    }

    const me = await User.findById(req.userId).select("role").lean();
    const isAdmin = String(me?.role || "").toLowerCase() === "admin";
    const owner = String(row.user_id || "") === String(req.userId || "");

    if (!owner && !isAdmin) {
      return res.status(403).json({ message: "Bạn không xem được refund này." });
    }

    return res.json({
      refund: {
        ...serializeRefund(row),
        booking: row.booking_id || null,
      },
    });
  } catch (e) {
    return res.status(500).json({ message: e?.message || "Không đọc được chi tiết refund." });
  }
}
