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
    processedBy: o.processed_by,
    failureMessage: o.failure_message,
    payoutMethod: o.payout_method,
    payoutPhone: o.payout_phone,
    payoutBankName: o.payout_bank_name,
    payoutBankAccountName: o.payout_bank_account_name,
    payoutBankAccountNumber: o.payout_bank_account_number,
    adminNote: o.admin_note,
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

/**
 * Áp ledger khi gateway hoàn tiền thật/thành công (mirror confirm-refund legacy).
 *
 * @param {import("../models/Booking.js").Booking} booking
 * @param {number} amt
 * @param {{ createLedger?: boolean, ledger?: { provider?: string, provider_order_id?: string, provider_trans_id?: string, provider_message?: string, provider_payload?: unknown } }} [opts]
 */
async function applySuccessfulRefundLedger(booking, amt, opts = {}) {
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

  const shouldCreateLedger = opts?.createLedger !== false;
  if (shouldCreateLedger) {
    const providerGuess = booking.payment_provider || "momo";
    const refundProviderLedger =
      providerGuess === "momo" ? "momo" : providerGuess === "vnpay" ? "vnpay" : "bank";

    const led = opts?.ledger || {};
    await PaymentTransaction.create({
      booking_id: booking._id,
      provider: String(led.provider || refundProviderLedger),
      type: "refund",
      amount: refundToProcess,
      status: "refunded",
      provider_order_id: String(led.provider_order_id || `REFUND_REQ_${booking._id}_${Date.now()}`),
      provider_trans_id: String(led.provider_trans_id || `LEDGER_${booking._id}_${Date.now()}`),
      provider_message: String(led.provider_message || "Refund processed"),
      provider_payload: led.provider_payload ?? { source: "refund_controller" },
    });
  }
}

/** POST /api/refunds/request */
export async function requestRefund(req, res) {
  try {
    const bookingIdRaw = req.body?.bookingId;
    const reason = String(req.body?.reason || "").trim();
    const payoutMethod = String(req.body?.payoutMethod || "").trim().toLowerCase();
    const payoutPhone = String(req.body?.payoutPhone || "").trim();
    const payoutBankName = String(req.body?.payoutBankName || "").trim();
    const payoutBankAccountName = String(req.body?.payoutBankAccountName || "").trim();
    const payoutBankAccountNumber = String(req.body?.payoutBankAccountNumber || "").trim();

    if (!mongoose.Types.ObjectId.isValid(String(bookingIdRaw || ""))) {
      return res.status(400).json({ message: "bookingId không hợp lệ." });
    }
    if (!reason) {
      return res.status(400).json({ message: "Vui lòng nhập lý do hủy." });
    }

    const dup = await Refund.exists({
      booking_id: bookingIdRaw,
      status: { $in: ["pending"] },
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

    // Allow refund request for:
    // - pending/confirmed bookings (user cancels and refunds in one action)
    // - cancelled bookings that were cancelled via legacy flow but still need refund processing
    if (!["pending", "confirmed", "cancelled"].includes(String(booking.status || ""))) {
      return res.status(400).json({
        message:
          "Chỉ áp dụng khi booking đang chờ/xác nhận hoặc đã hủy (để xử lý hoàn tiền) và đã có thanh toán.",
      });
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

    // If booking already cancelled via legacy flow, do NOT overwrite cancelled_at unconditionally.
    const wasCancelledAlready = String(booking.status || "") === "cancelled";

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

    if (!wasCancelledAlready) {
      booking.status = "cancelled";
      booking.cancelled_at = now;
      booking.cancel_reason = reason;
      booking.assigned_room_ids = [];
      booking.assigned_room_id = null;
    } else {
      // keep legacy cancellation metadata; only fill missing reason if empty
      if (!booking.cancel_reason) booking.cancel_reason = reason;
      if (!booking.cancelled_at) booking.cancelled_at = now;
    }

    await booking.save();

    let refundDoc;
    try {
      refundDoc = await Refund.create({
        booking_id: booking._id,
        user_id: req.userId,
        amount: breakdown.refundAmount,
        original_amount: breakdown.originalAmount,
        cancellation_fee: breakdown.cancellationFee,
        reason,
        status: "pending",
        payment_method: paymentMethodStored,
        processed_at: null,
        refund_transaction_id: "",
        failure_message: "",
        payout_method: payoutMethod,
        payout_phone: payoutPhone,
        payout_bank_name: payoutBankName,
        payout_bank_account_name: payoutBankAccountName,
        payout_bank_account_number: payoutBankAccountNumber,
      });
    } catch (e) {
      // Unique partial index may throw duplicate key when two tabs submit simultaneously
      const code = Number(e?.code || 0);
      if (code === 11000) {
        const existing = await Refund.findOne({
          booking_id: booking._id,
          status: { $in: ["pending", "processing"] },
        })
          .sort({ createdAt: -1 })
          .lean();
        return res.status(409).json({
          message: "Booking này đã có yêu cầu hoàn tiền đang được xử lý.",
          refund: existing ? serializeRefund(existing) : null,
        });
      }
      throw e;
    }

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

    if (breakdown.refundAmount > 0) {
      return res.status(201).json({
        message: "Đã nhận yêu cầu. Vui lòng chờ admin duyệt hoàn tiền thủ công.",
        refund: serializeRefund(refundDoc),
        policy: {
          cancellationFee: breakdown.cancellationFee,
          refundAmount: breakdown.refundAmount,
          originalAmount: breakdown.originalAmount,
        },
      });
    }

    // refund 0₫ theo policy: đóng sổ ngay để UI không chờ
    refundDoc.status = "success";
    refundDoc.processed_at = new Date();
    refundDoc.refund_transaction_id = "REFUND_0";
    refundDoc.failure_message = "";
    await refundDoc.save();

    return res.status(201).json({
      message: "Đã hủy booking. Số tiền hoàn 0₫ theo policy.",
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

/** POST /api/refunds/admin/approve/:refundId — admin marks manual refund as done */
export async function approveRefundManual(req, res) {
  try {
    const id = String(req.params.refundId || "");
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "refundId không hợp lệ." });
    }

    const refund = await Refund.findById(id);
    if (!refund) {
      return res.status(404).json({ message: "Không tìm thấy refund." });
    }

    if (String(refund.status) !== "pending") {
      return res.status(400).json({ message: "Chỉ duyệt refund trạng thái pending." });
    }

    const booking = await Booking.findById(refund.booking_id);
    if (!booking) {
      refund.status = "failed";
      refund.processed_at = new Date();
      refund.failure_message = "Không tìm thấy booking để xử lý refund.";
      refund.processed_by = req.userId || null;
      await refund.save();
      return res.status(404).json({ message: "Không tìm thấy booking của refund.", refund: serializeRefund(refund) });
    }

    const adminNote = String(req.body?.adminNote || "").trim();
    const manualRef = String(req.body?.manualRef || "").trim(); // bank ref / momo ref / evidence id
    const finishedAt = new Date();
    const amt = Math.round(Number(refund.amount) || 0);

    refund.status = "success";
    refund.refund_transaction_id = manualRef || refund.refund_transaction_id || `MANUAL_REF_${Date.now()}`;
    refund.processed_at = finishedAt;
    refund.processed_by = req.userId || null;
    refund.failure_message = "";
    refund.admin_note = adminNote;
    await refund.save();

    if (amt > 0) {
      await applySuccessfulRefundLedger(booking, amt, {
        createLedger: true,
        ledger: {
          provider: "bank",
          provider_order_id: `MANUAL_${String(refund._id)}_${Date.now()}`,
          provider_trans_id: String(refund.refund_transaction_id || ""),
          provider_message: "Refund approved manually by admin",
          provider_payload: {
            refundId: String(refund._id),
            payout: {
              method: refund.payout_method || "",
              phone: refund.payout_phone || "",
              bankName: refund.payout_bank_name || "",
              bankAccountName: refund.payout_bank_account_name || "",
              bankAccountNumber: refund.payout_bank_account_number || "",
            },
            adminNote,
          },
        },
      });
    } else {
      booking.refund_status = "paid";
      booking.refund_processed_amount = 0;
      booking.refund_processed_at = finishedAt;
      await booking.save();
    }

    return res.json({
      message: "Đã duyệt hoàn tiền (thủ công).",
      refund: serializeRefund(refund),
    });
  } catch (e) {
    return res.status(500).json({ message: e?.message || "Lỗi server khi duyệt hoàn tiền." });
  }
}

/** POST /api/refunds/admin/reject/:refundId — admin rejects manual refund */
export async function rejectRefundManual(req, res) {
  try {
    const id = String(req.params.refundId || "");
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "refundId không hợp lệ." });
    }

    const refund = await Refund.findById(id);
    if (!refund) {
      return res.status(404).json({ message: "Không tìm thấy refund." });
    }
    if (String(refund.status) !== "pending") {
      return res.status(400).json({ message: "Chỉ từ chối refund trạng thái pending." });
    }

    const reason = String(req.body?.reason || "").trim();
    const adminNote = String(req.body?.adminNote || "").trim();

    refund.status = "failed";
    refund.processed_at = new Date();
    refund.processed_by = req.userId || null;
    refund.failure_message = reason || "Admin từ chối hoàn tiền.";
    refund.admin_note = adminNote;
    await refund.save();

    // reflect on booking so UI can show rejected (no money moved)
    const booking = await Booking.findById(refund.booking_id);
    if (booking) {
      booking.deposit_status = "paid";
      booking.refund_status = "rejected";
      booking.refund_rejected_reason = String(refund.failure_message || "Admin từ chối hoàn tiền.").slice(0, 500);
      await booking.save();
    }

    return res.json({ message: "Đã từ chối hoàn tiền.", refund: serializeRefund(refund) });
  } catch (e) {
    return res.status(500).json({ message: e?.message || "Lỗi server khi từ chối hoàn tiền." });
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
    const normalized = statusRaw.trim().toLowerCase();
    /** @type {Record<string, unknown>} */
    let filter = {};
    if (normalized && normalized !== "all") {
      // allow: pending | success | failed
      if (!["pending", "success", "failed"].includes(normalized)) {
        return res.status(400).json({ message: "status không hợp lệ. Dùng pending|success|failed|all." });
      }
      filter = { status: normalized };
    } else if (!normalized) {
      // default view: show items needing attention + recently completed for audit
      filter = { status: { $in: ["pending", "failed", "success"] } };
    }

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
