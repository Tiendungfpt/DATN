import mongoose from "mongoose";
import Booking from "../models/Booking.js";
import Refund from "../models/Refund.js";
import PaymentTransaction from "../models/PaymentTransaction.js";
import Rooms from "../models/rooms.js";
import User from "../models/User.js";
import momoController from "./momoController.js";
import { ROOM_OCCUPYING_BOOKING_STATUSES } from "../utils/bookingSchedule.js";
import { computeRefundBreakdown } from "../utils/refundPolicy.js";
import { createNotification } from "../utils/notification.js";
import { sendRefundStatusEmail } from "../services/emailService.js";

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

function serializeRefund(raw) {
  const o =
    typeof raw?.toObject === "function"
      ? raw.toObject({ virtuals: false })
      : { ...(raw || {}) };

  const bookingIdResolved =
    o.booking_id && typeof o.booking_id === "object" && o.booking_id._id ? o.booking_id._id : o.booking_id;

  const userIdResolved =
    o.user_id && typeof o.user_id === "object" && o.user_id._id ? o.user_id._id : o.user_id;

  const out = {};
  const statusRaw = String(o.status || "pending");
  const statusApi = statusRaw === "success" ? "completed" : statusRaw;

  Object.assign(out, {
    id: String(o._id || ""),
    bookingId: bookingIdResolved,
    userId: userIdResolved,
    amount: o.amount,
    originalAmount: o.original_amount,
    cancellationFee: o.cancellation_fee,
    reason: o.reason,
    status: statusApi,
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
    provider: o.provider,
    providerResultCode: o.provider_result_code,
    providerMessage: o.provider_message,
    providerRefundOrderId: o.provider_refund_order_id,
    providerRefundRequestId: o.provider_refund_request_id,
    retryCount: o.retry_count ?? 0,
    createdAt: o.createdAt,
    updatedAt: o.updatedAt,
  });
  return out;
}

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

  let gateway = booking.payment_provider || "";
  const p = String(txn.provider || "").toLowerCase();
  if (!gateway && p === "momo") gateway = "momo";
  if (!gateway && p === "vnpay") gateway = "vnpay";

  const transId = String(txn.provider_trans_id || booking.payment_transaction_id || "").trim();
  return { payment_method: gateway || p || "", transId };
}

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

async function resolveMomoOriginalTransId(booking) {
  const fromBooking = Number(String(booking?.payment_transaction_id || "").trim());
  if (Number.isFinite(fromBooking) && fromBooking > 0) return Math.trunc(fromBooking);

  const last = await PaymentTransaction.findOne({
    booking_id: booking._id,
    provider: "momo",
    status: "succeeded",
    type: { $in: ["deposit", "balance"] },
  })
    .sort({ updatedAt: -1 })
    .lean();
  const fromLedger = Number(String(last?.provider_trans_id || "").trim());
  if (Number.isFinite(fromLedger) && fromLedger > 0) return Math.trunc(fromLedger);
  return 0;
}

function logRefundOpsAlert(payload) {
  console.error("[REFUND_OPS_ALERT]", JSON.stringify({ ts: new Date().toISOString(), ...payload }));
}

function getMomoAsyncResultCodes() {
  const raw = String(process.env.MOMO_REFUND_ASYNC_RESULT_CODES || "7002")
    .split(/[,\s]+/)
    .map((x) => Number.parseInt(String(x).trim(), 10))
    .filter((n) => Number.isFinite(n));
  return raw.length ? raw : [7002];
}

function isMomoRefundPendingResult(resultCode) {
  const n = Number(resultCode);
  if (!Number.isFinite(n)) return false;
  return getMomoAsyncResultCodes().includes(n);
}

async function notifyRefundProcessing(booking, refund) {
  try {
    await createNotification({
      userId: booking.user_id,
      bookingId: booking._id,
      type: "refund_processing",
      title: "Đang xử lý hoàn tiền",
      message: `${(Number(refund.amount) || 0).toLocaleString("vi-VN")} ₫ — tiền có về chậm vài phút hoặc vài ngày tùy ngân hàng.`,
      eventKey: `refund_processing_${booking._id}_${Date.now()}`,
    });
  } catch {
    /* ignore */
  }
}

async function notifyRefundGatewayOutcome(booking, refund, opts) {
  const { completed, message = "" } = opts;
  try {
    await createNotification({
      userId: booking.user_id,
      bookingId: booking._id,
      type: completed ? "refund_completed" : "refund_failed",
      title: completed ? "Hoàn tiền xong" : "Hoàn tiền không thành công",
      message: completed
        ? `${(Number(refund.amount) || 0).toLocaleString("vi-VN")} ₫. ${message}`.trim()
        : `${message || "Lỗi thanh toán"}`,
      eventKey: `refund_outcome_${booking._id}_${completed ? "ok" : "fail"}_${String(refund._id).slice(-6)}`,
    });
    if (booking.guest_email) {
      await sendRefundStatusEmail({
        to: booking.guest_email,
        guestName: booking.guest_name || "",
        bookingId: booking._id,
        stage: completed ? "refunded" : "rejected",
        amount: refund.amount,
        reason: message,
      });
    }
  } catch {
    /* ignore */
  }
}

async function runMomoRefundGateway(refund, booking, { amt, manualRef, finishedAt }) {
  const originalTransId = await resolveMomoOriginalTransId(booking);
  if (!originalTransId) {
    refund.status = "failed";
    refund.processed_at = finishedAt;
    refund.failure_message = "Missing original MoMo transId";
    refund.provider = "momo";
    refund.provider_message = "Không tìm thấy transId MoMo gốc";
    await refund.save();
    logRefundOpsAlert({
      refundId: String(refund._id),
      bookingId: String(booking._id),
      step: "momo_refund_missing_transId",
    });
    return {
      outcome: "failed",
      refund,
      clientMessage:
        "Không tìm thấy mã giao dịch MoMo gốc. Hoàn tay và nhập mã tham chiếu khi duyệt.",
    };
  }

  const refundOrderId = `REFUND_${String(refund._id)}_${Date.now()}`.slice(0, 50);
  const refundRequestId = `RE_${String(refund._id).slice(-6)}_${Date.now()}`.slice(0, 50);
  const description = `Refund booking ${String(booking._id).slice(-6).toUpperCase()}`;

  refund.provider_refund_order_id = refundOrderId;
  refund.provider_refund_request_id = refundRequestId;
  await refund.save();

  const tx = await PaymentTransaction.create({
    booking_id: booking._id,
    provider: "momo",
    type: "refund",
    amount: amt,
    status: "created",
    provider_order_id: refundOrderId,
    provider_message: "Refund requested",
    provider_payload: {
      refundId: String(refund._id),
      originalTransId,
      requestId: refundRequestId,
    },
  });

  const r = await momoController.refundPaymentInternal({
    transId: originalTransId,
    amount: amt,
    description,
    lang: "vi",
    orderId: refundOrderId,
    requestId: refundRequestId,
  });

  const rc = Number(r?.resultCode);

  if (r?.ok && rc === 0) {
    refund.status = "completed";
    refund.refund_transaction_id =
      manualRef || String(r?.data?.transId || tx.provider_order_id || refund.refund_transaction_id || "");
    refund.processed_at = finishedAt;
    refund.failure_message = "";
    refund.provider = "momo";
    refund.provider_result_code = 0;
    refund.provider_message = String(r?.message || "Successful.");
    refund.provider_payload = r?.data || null;
    await refund.save();

    await applySuccessfulRefundLedger(booking, amt, {
      createLedger: false,
    });

    await PaymentTransaction.findByIdAndUpdate(tx._id, {
      status: "refunded",
      provider_trans_id: String(r?.data?.transId || ""),
      provider_message: String(r?.message || "Successful."),
      provider_payload: { ...(tx.provider_payload || {}), refundResult: r?.data || null },
    });

    await notifyRefundGatewayOutcome(booking, refund, {
      completed: true,
      message: "MoMo đã nhận hoàn — tiền có thể về chậm vài ngày.",
    });

    return { outcome: "completed", refund };
  }

  if (Number.isFinite(rc) && isMomoRefundPendingResult(rc)) {
    refund.status = "processing";
    refund.processed_at = null;
    refund.failure_message = "";
    refund.provider = "momo";
    refund.provider_result_code = rc;
    refund.provider_message = String(r?.message || "Đang xử lý");
    refund.provider_payload = r?.data || null;
    await refund.save();

    await PaymentTransaction.findByIdAndUpdate(tx._id, {
      status: "pending_provider",
      provider_message: String(r?.message || "pending_provider"),
      provider_payload: { ...(tx.provider_payload || {}), refundResult: r?.data || null },
    });

    await notifyRefundProcessing(booking, refund);

    return { outcome: "async", refund };
  }

  await PaymentTransaction.findByIdAndUpdate(tx._id, {
    status: "failed",
    provider_message: String(r?.message || "Refund failed"),
    provider_payload: { ...(tx.provider_payload || {}), refundResult: r?.data || null },
  });

  refund.status = "failed";
  refund.processed_at = finishedAt;
  refund.failure_message = String(r?.message || "MoMo refund failed");
  refund.provider = "momo";
  refund.provider_result_code = Number.isFinite(rc) ? rc : null;
  refund.provider_message = String(r?.message || "");
  refund.provider_payload = r?.data || null;
  await refund.save();

  logRefundOpsAlert({
    refundId: String(refund._id),
    bookingId: String(booking._id),
    step: "momo_refund_failed",
    resultCode: rc,
    message: r?.message,
  });

  await notifyRefundGatewayOutcome(booking, refund, {
    completed: false,
    message: String(r?.message || "MoMo báo lỗi"),
  });

  return {
    outcome: "failed",
    refund,
    clientMessage: `MoMo: ${String(r?.message || "lỗi")}`.trim(),
  };
}

function momoQueryIndicatesRefundSuccess(data) {
  if (!data || Number(data.resultCode) !== 0) return false;
  const rows = Array.isArray(data.refundTrans) ? data.refundTrans : [];
  if (rows.length === 0) return true;
  return rows.some((t) => Number(t.resultCode) === 0);
}

function momoQueryExtractRefundTransId(data) {
  const rows = Array.isArray(data?.refundTrans) ? data.refundTrans : [];
  const ok = rows.find((t) => Number(t.resultCode) === 0);
  if (ok && ok.transId != null) return String(ok.transId);
  if (data?.transId != null) return String(data.transId);
  return "";
}

export async function queryRefundProvider(req, res) {
  try {
    const id = String(req.params.refundId || "");
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "refundId không hợp lệ." });
    }
    const refund = await Refund.findById(id);
    if (!refund) {
      return res.status(404).json({ message: "Không tìm thấy refund." });
    }
    const pm = String(refund.payment_method || "").toLowerCase();
    if (pm !== "momo") {
      return res.status(400).json({ message: "Chỉ tra cứu được khi thanh toán bằng MoMo." });
    }
    const st = String(refund.status || "");
    if (st === "completed" || st === "success") {
      return res.json({ message: "Đã hoàn tiền xong.", refund: serializeRefund(refund) });
    }
    const orderId = String(refund.provider_refund_order_id || "").trim();
    const requestId = String(refund.provider_refund_request_id || "").trim();
    if (!orderId || !requestId) {
      return res.status(400).json({
        message: "Chưa có mã tra cứu — cần duyệt hoặc thử lại hoàn trước.",
      });
    }
    const q = await momoController.refundQueryInternal({ orderId, requestId, lang: "vi" });
    const data = q.data || {};
    const topRc = Number.isFinite(Number(q.resultCode)) ? Number(q.resultCode) : Number(data.resultCode);
    refund.provider_result_code = Number.isFinite(topRc) ? topRc : null;
    refund.provider_message = String(q.message || data.message || "");
    const prevPayload =
      refund.provider_payload && typeof refund.provider_payload === "object" ? refund.provider_payload : {};
    refund.provider_payload = { ...prevPayload, lastQueryAt: new Date().toISOString(), lastQuery: data };

    if (q.ok && momoQueryIndicatesRefundSuccess(data)) {
      const booking = await Booking.findById(refund.booking_id);
      if (!booking) {
        await refund.save();
        return res.status(404).json({ message: "Không tìm thấy booking." });
      }
      const amt = Math.round(Number(refund.amount) || 0);
      const finishedAt = new Date();
      const tid = momoQueryExtractRefundTransId(data);
      refund.status = "completed";
      refund.processed_at = finishedAt;
      refund.failure_message = "";
      if (tid) refund.refund_transaction_id = tid;
      await refund.save();

      if (amt > 0 && String(booking.refund_status || "") !== "paid") {
        await applySuccessfulRefundLedger(booking, amt, { createLedger: false });
      }

      await PaymentTransaction.findOneAndUpdate(
        { booking_id: booking._id, provider: "momo", type: "refund", provider_order_id: orderId },
        {
          status: "refunded",
          provider_trans_id: tid,
          provider_message: "Query confirmed refund",
          provider_payload: { queryConfirm: data },
        },
      );

      await notifyRefundGatewayOutcome(booking, refund, {
        completed: true,
        message: "MoMo xác nhận đã hoàn.",
      });

      return res.json({
        message: "Đã hoàn xong.",
        refund: serializeRefund(refund),
        query: data,
      });
    }

    await refund.save();
    return res.json({
      message: "Chưa thấy hoàn xong — thử lại sau.",
      refund: serializeRefund(refund),
      query: data,
    });
  } catch (e) {
    return res.status(500).json({ message: e?.message || "Lỗi tra cứu refund." });
  }
}

export async function retryProviderRefund(req, res) {
  try {
    const id = String(req.params.refundId || "");
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "refundId không hợp lệ." });
    }
    const refund = await Refund.findById(id);
    if (!refund) {
      return res.status(404).json({ message: "Không tìm thấy refund." });
    }
    if (String(refund.status) !== "failed") {
      return res.status(400).json({ message: "Chỉ thử lại khi refund đang failed." });
    }
    const pm = String(refund.payment_method || "").toLowerCase();
    if (pm !== "momo") {
      return res.status(400).json({ message: "Chỉ thử lại hoàn tự động cho MoMo." });
    }
    const configured =
      Boolean(momoController?.partnerCode) &&
      Boolean(momoController?.accessKey) &&
      Boolean(momoController?.secretKey);
    if (!configured) {
      return res.status(400).json({ message: "Chưa cấu hình MoMo trên server." });
    }
    const booking = await Booking.findById(refund.booking_id);
    if (!booking) {
      return res.status(404).json({ message: "Không tìm thấy booking." });
    }

    const adminNote = String(req.body?.adminNote || "").trim();
    const manualRef = String(req.body?.manualRef || "").trim();
    const finishedAt = new Date();
    const amt = Math.round(Number(refund.amount) || 0);

    refund.retry_count = (Number(refund.retry_count) || 0) + 1;
    refund.status = "processing";
    refund.processed_by = req.userId || null;
    refund.processed_at = null;
    refund.failure_message = "";
    if (adminNote) refund.admin_note = adminNote;
    refund.provider = "momo";
    refund.provider_result_code = null;
    refund.provider_message = "";
    refund.provider_payload = null;
    await refund.save();

    const gatewayOut = await runMomoRefundGateway(refund, booking, { amt, manualRef, finishedAt });
    if (gatewayOut.outcome === "completed") {
      return res.json({
        message: "MoMo đã nhận hoàn.",
        refund: serializeRefund(gatewayOut.refund),
      });
    }
    if (gatewayOut.outcome === "async") {
      return res.status(202).json({
        message: "Đã gửi lại MoMo — đang xử lý, chờ tra cứu hoặc thử lại.",
        refund: serializeRefund(gatewayOut.refund),
      });
    }
    return res.status(400).json({
      message: gatewayOut.clientMessage,
      refund: serializeRefund(gatewayOut.refund),
    });
  } catch (e) {
    return res.status(500).json({ message: e?.message || "Lỗi thử lại refund." });
  }
}

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

    if (!["pending", "confirmed", "cancelled"].includes(String(booking.status || ""))) {
      return res.status(400).json({
        message: "Chỉ hủy/hoàn được khi đặt đang chờ, đã xác nhận hoặc đã hủy và đã có thanh toán.",
      });
    }

    const originalAmount = resolveRefundOriginalAmount(booking);
    if (originalAmount <= 0) {
      return res.status(400).json({ message: "Chưa có khoản thanh toán để hoàn." });
    }

    const breakdown = computeRefundBreakdown(new Date(), booking.check_in_date, originalAmount);
    const ledgerMeta = await resolvePaymentLedgerMeta(booking);

    if (!booking.payment_transaction_id && ledgerMeta.transId) {
      booking.payment_transaction_id = ledgerMeta.transId;
    }

    const paymentMethodStored = String(booking.payment_provider || ledgerMeta.payment_method || "momo").trim();

    const now = new Date();
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

    // Flow B: user request does NOT cancel booking immediately.
    // Booking will be cancelled only after admin approves the refund request.
    // We still keep a reason snapshot for admin review/email context.
    if (!booking.cancel_reason) booking.cancel_reason = reason;

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

    try {
      await createNotification({
        userId: booking.user_id,
        bookingId: booking._id,
        type: "refund_requested",
        title: "Đã gửi yêu cầu hủy & hoàn tiền",
        message:
          breakdown.refundAmount > 0
            ? `#${String(booking._id).slice(-6).toUpperCase()} đã gửi yêu cầu. Hoàn ${breakdown.refundAmount.toLocaleString("vi-VN")} ₫ đang chờ khách sạn duyệt.`
            : `#${String(booking._id).slice(-6).toUpperCase()} đã gửi yêu cầu hủy. Trường hợp này không được hoàn tiền theo chính sách.`,
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
      /* ignore */
    }

    if (breakdown.refundAmount > 0) {
      return res.status(201).json({
        message: "Đã gửi. Chờ khách sạn duyệt hoàn tiền.",
        refund: serializeRefund(refundDoc),
        policy: {
          cancellationFee: breakdown.cancellationFee,
          refundAmount: breakdown.refundAmount,
          originalAmount: breakdown.originalAmount,
        },
      });
    }

    refundDoc.status = "completed";
    refundDoc.processed_at = new Date();
    refundDoc.refund_transaction_id = "REFUND_0";
    refundDoc.failure_message = "";
    await refundDoc.save();

    return res.status(201).json({
      message: "Đã gửi yêu cầu. Trường hợp này không hoàn tiền theo thời hạn hủy.",
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
    const manualRef = String(req.body?.manualRef || "").trim();
    const finishedAt = new Date();
    const amt = Math.round(Number(refund.amount) || 0);

    const paymentMethod = String(refund.payment_method || booking.payment_provider || "").trim().toLowerCase();
    const shouldAutoRefundMomo =
      amt > 0 &&
      paymentMethod === "momo" &&
      Boolean(momoController?.partnerCode) &&
      Boolean(momoController?.accessKey) &&
      Boolean(momoController?.secretKey);

    refund.status = "processing";
    refund.processed_by = req.userId || null;
    refund.processed_at = null;
    refund.failure_message = "";
    refund.admin_note = adminNote;
    refund.provider = shouldAutoRefundMomo ? "momo" : (paymentMethod || "manual");
    refund.provider_result_code = null;
    refund.provider_message = "";
    refund.provider_payload = null;
    await refund.save();

    if (shouldAutoRefundMomo) {
      const gatewayOut = await runMomoRefundGateway(refund, booking, { amt, manualRef, finishedAt });
      if (gatewayOut.outcome === "completed") {
        // Cancel booking only after refund approval (Flow B)
        if (String(booking.status || "") !== "cancelled") {
          const prevRooms = [...(booking.assigned_room_ids || [])];
          if (booking.assigned_room_id) prevRooms.push(booking.assigned_room_id);
          booking.status = "cancelled";
          booking.cancelled_at = finishedAt;
          booking.cancel_reason = booking.cancel_reason || refund.reason || "refund_approved";
          booking.assigned_room_ids = [];
          booking.assigned_room_id = null;
          await booking.save();
          for (const p of prevRooms) {
            await syncRoomStatuses(p);
          }
        }
        return res.json({
          message: "Đã duyệt — MoMo đã nhận hoàn.",
          refund: serializeRefund(gatewayOut.refund),
        });
      }
      if (gatewayOut.outcome === "async") {
        // Cancel booking after admin approval even when provider is async (Flow B)
        if (String(booking.status || "") !== "cancelled") {
          const prevRooms = [...(booking.assigned_room_ids || [])];
          if (booking.assigned_room_id) prevRooms.push(booking.assigned_room_id);
          booking.status = "cancelled";
          booking.cancelled_at = finishedAt;
          booking.cancel_reason = booking.cancel_reason || refund.reason || "refund_approved";
          booking.assigned_room_ids = [];
          booking.assigned_room_id = null;
          await booking.save();
          for (const p of prevRooms) {
            await syncRoomStatuses(p);
          }
        }
        return res.status(202).json({
          message: "Đã gửi MoMo — đang xử lý, dùng Tra cứu hoặc Thử lại.",
          refund: serializeRefund(gatewayOut.refund),
        });
      }
      return res.status(400).json({
        message: gatewayOut.clientMessage,
        refund: serializeRefund(gatewayOut.refund),
      });
    }

    refund.status = "completed";
    refund.refund_transaction_id = manualRef || refund.refund_transaction_id || `MANUAL_REF_${Date.now()}`;
    refund.processed_at = finishedAt;
    refund.failure_message = "";
    refund.provider = paymentMethod || "manual";
    refund.provider_result_code = null;
    refund.provider_message = "Approved manually";
    refund.provider_payload = null;
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

    // Cancel booking only after admin approval (Flow B)
    if (String(booking.status || "") !== "cancelled") {
      const prevRooms = [...(booking.assigned_room_ids || [])];
      if (booking.assigned_room_id) prevRooms.push(booking.assigned_room_id);
      booking.status = "cancelled";
      booking.cancelled_at = finishedAt;
      booking.cancel_reason = booking.cancel_reason || refund.reason || "refund_approved";
      booking.assigned_room_ids = [];
      booking.assigned_room_id = null;
      await booking.save();
      for (const p of prevRooms) {
        await syncRoomStatuses(p);
      }
    }

    await notifyRefundGatewayOutcome(booking, refund, {
      completed: true,
      message: "Khách sạn đã xác nhận hoàn tiền.",
    });

    return res.json({
      message: "Đã duyệt hoàn tiền.",
      refund: serializeRefund(refund),
    });
  } catch (e) {
    return res.status(500).json({ message: e?.message || "Lỗi server khi duyệt hoàn tiền." });
  }
}

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

export async function listRefundsAdmin(req, res) {
  try {
    const statusRaw = req.query.status ? String(req.query.status) : "";
    const normalized = statusRaw.trim().toLowerCase();
    let filter = {};
    if (normalized && normalized !== "all") {
      if (!["pending", "processing", "completed", "failed", "success"].includes(normalized)) {
        return res.status(400).json({
          message: "status không hợp lệ. Dùng pending|processing|completed|failed|success|all.",
        });
      }
      if (normalized === "completed" || normalized === "success") {
        filter = { status: { $in: ["completed", "success"] } };
      } else {
        filter = { status: normalized };
      }
    } else if (!normalized) {
      filter = { status: { $in: ["pending", "processing", "failed", "completed", "success"] } };
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
