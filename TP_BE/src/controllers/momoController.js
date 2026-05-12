import axios from "axios";
import crypto from "crypto";
import Booking from "../models/Booking.js";
import PaymentTransaction from "../models/PaymentTransaction.js";
import dotenv from "dotenv";
import { createNotification } from "../utils/notification.js";
import { isDepositSufficient } from "../utils/bookingPolicy.js";

dotenv.config();

function momoAsciiOrderInfo(roomLabel, mongoIdHex) {
  const deacc = String(roomLabel || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\u0110/g, "D")
    .replace(/\u0111/g, "d");
  let ascii = "";
  for (let i = 0; i < deacc.length && ascii.length < 120; i++) {
    const c = deacc[i];
    const code = c.charCodeAt(0);
    if ((code >= 48 && code <= 57) || (code >= 65 && code <= 90) || (code >= 97 && code <= 122))
      ascii += c;
    else if (code === 32 || code === 45 || code === 95) ascii += code === 32 ? " " : "-";
    else ascii += "";
  }
  const tail = String(mongoIdHex || "").replace(/[^\da-f]/gi, "").slice(-12) || "x";
  const core = ascii.replace(/\s+/g, " ").trim() || "phong ks";
  return `Thanh toan ${core} ${tail}`.slice(0, 250);
}

function normalizeVnMobile(raw) {
  let d = String(raw || "").replace(/\D/g, "");
  if (!d) return "";
  if (d.startsWith("84")) d = d.slice(2);
  if (!d.startsWith("0")) d = `0${d}`;
  if (d.length < 10 || d.length > 11) return "";
  return d;
}

class MoMoController {
  constructor() {
    this.partnerCode = process.env.MOMO_PARTNER_CODE;
    this.accessKey = process.env.MOMO_ACCESS_KEY;
    this.secretKey = process.env.MOMO_SECRET_KEY;

    this.createEndpoint = process.env.MOMO_CREATE_ENDPOINT;
    this.queryEndpoint = process.env.MOMO_QUERY_ENDPOINT;
    this.refundEndpoint =
      process.env.MOMO_REFUND_ENDPOINT || "https://test-payment.momo.vn/v2/gateway/api/refund";
    this.refundQueryEndpoint =
      process.env.MOMO_REFUND_QUERY_ENDPOINT || "https://test-payment.momo.vn/v2/gateway/api/refund/query";
    this.requestType = process.env.MOMO_REQUEST_TYPE || "captureWallet";
  }

  async refundQueryInternal(input) {
    if (!this.partnerCode || !this.accessKey || !this.secretKey) {
      return { ok: false, error: "missing_keys", message: "Thiếu cấu hình MoMo refund query" };
    }
    const orderId = String(input?.orderId || "").trim();
    const requestId = String(input?.requestId || "").trim();
    if (!orderId || !requestId) {
      return { ok: false, error: "invalid_params", message: "Thiếu orderId/requestId tra cứu hoàn tiền" };
    }
    const lang = input?.lang === "en" ? "en" : "vi";
    const rawSignature =
      `accessKey=${this.accessKey}` +
      `&orderId=${orderId}` +
      `&partnerCode=${this.partnerCode}` +
      `&requestId=${requestId}`;
    const signature = crypto.createHmac("sha256", this.secretKey).update(rawSignature).digest("hex");
    const body = {
      partnerCode: this.partnerCode,
      orderId,
      requestId,
      lang,
      signature,
    };
    try {
      const resp = await axios.post(this.refundQueryEndpoint, body, { timeout: 35000 });
      const data = resp?.data || {};
      const resultCode = Number(data?.resultCode);
      const ok = resultCode === 0;
      return { ok, data, resultCode, message: String(data?.message || "") || (ok ? "Successful" : "Query failed") };
    } catch (e) {
      const upstream = e?.response?.data;
      return {
        ok: false,
        error: "network_or_upstream",
        message: String(upstream?.message || e?.message || "Refund query failed"),
        data: upstream || null,
      };
    }
  }

  async refundPaymentInternal(input) {
    if (!this.partnerCode || !this.accessKey || !this.secretKey) {
      return { ok: false, error: "missing_keys", message: "Thiếu cấu hình MoMo refund" };
    }
    if (!this.refundEndpoint) {
      return { ok: false, error: "missing_refund_endpoint", message: "Thiếu MOMO_REFUND_ENDPOINT" };
    }

    const amount = Math.round(Math.max(0, Number(input?.amount) || 0));
    const transIdNum = Number(input?.transId);
    const transId = Number.isFinite(transIdNum) ? Math.trunc(transIdNum) : NaN;
    if (!Number.isFinite(transId) || transId <= 0) {
      return { ok: false, error: "invalid_transId", message: "Thiếu/không hợp lệ transId giao dịch MoMo gốc" };
    }
    if (amount <= 0) {
      return { ok: false, error: "invalid_amount", message: "Số tiền hoàn không hợp lệ" };
    }

    const orderId = String(input?.orderId || `REF_${transId}_${Date.now()}`).slice(0, 50);
    const requestId = String(input?.requestId || `RE_${Date.now()}`).slice(0, 50);
    const description = String(input?.description || "Refund booking").slice(0, 255);
    const lang = input?.lang === "en" ? "en" : "vi";

    const rawSignature =
      `accessKey=${this.accessKey}` +
      `&amount=${amount}` +
      `&description=${description}` +
      `&orderId=${orderId}` +
      `&partnerCode=${this.partnerCode}` +
      `&requestId=${requestId}` +
      `&transId=${transId}`;

    const signature = crypto.createHmac("sha256", this.secretKey).update(rawSignature).digest("hex");

    const body = {
      partnerCode: this.partnerCode,
      orderId,
      requestId,
      amount,
      transId,
      lang,
      description,
      signature,
    };

    try {
      const resp = await axios.post(this.refundEndpoint, body, {
        // MoMo docs: minimum timeout 30s
        timeout: 35000,
      });
      const data = resp?.data || {};
      const resultCode = Number(data?.resultCode);
      const ok = resultCode === 0;
      return { ok, data, resultCode, message: String(data?.message || "") || (ok ? "Successful" : "Refund failed") };
    } catch (e) {
      const upstream = e?.response?.data;
      const msg = String(upstream?.message || e?.message || "Refund request failed");
      return {
        ok: false,
        error: "network_or_upstream",
        message: msg,
        data: upstream || null,
      };
    }
  }

  /**
   * Verify signature for MoMo result handling (IPN / redirect callback).
   *
   * MoMo signature docs (v2/v3 gateway):
   * rawSignature = accessKey=...&amount=...&extraData=...&message=...&orderId=...&orderInfo=...&orderType=...&partnerCode=...&payType=...&requestId=...&responseTime=...&resultCode=...&transId=...
   *
   * @param {Record<string, unknown>} payload
   */
  verifyResultSignature(payload) {
    const accessKey = this.accessKey;
    const secretKey = this.secretKey;
    if (!accessKey || !secretKey) return { ok: false, err: "missing_keys" };

    const sig = String(payload?.signature || "").trim();
    if (!sig) return { ok: false, err: "missing_signature" };

    const amount = String(payload?.amount ?? "");
    const extraData = String(payload?.extraData ?? "");
    const message = String(payload?.message ?? "");
    const orderId = String(payload?.orderId ?? "");
    const orderInfo = String(payload?.orderInfo ?? "");
    const orderType = String(payload?.orderType ?? "");
    const partnerCode = String(payload?.partnerCode ?? "");
    const payType = String(payload?.payType ?? "");
    const requestId = String(payload?.requestId ?? "");
    const responseTime = String(payload?.responseTime ?? "");
    const resultCode = String(payload?.resultCode ?? "");
    const transId = String(payload?.transId ?? "");

    const rawSignature =
      `accessKey=${accessKey}` +
      `&amount=${amount}` +
      `&extraData=${extraData}` +
      `&message=${message}` +
      `&orderId=${orderId}` +
      `&orderInfo=${orderInfo}` +
      `&orderType=${orderType}` +
      `&partnerCode=${partnerCode}` +
      `&payType=${payType}` +
      `&requestId=${requestId}` +
      `&responseTime=${responseTime}` +
      `&resultCode=${resultCode}` +
      `&transId=${transId}`;

    const expected = crypto.createHmac("sha256", secretKey).update(rawSignature).digest("hex");
    return { ok: expected === sig, err: expected === sig ? "" : "signature_mismatch", expected };
  }

  createPayment = async (req, res) => {
    try {
      const { bookingId, requestType: requestTypeFromClient, type = "deposit" } = req.body;

      if (!bookingId) {
        return res.status(400).json({
          success: false,
          message: "Thiếu bookingId",
        });
      }
      if (!this.partnerCode || !this.accessKey || !this.secretKey || !this.createEndpoint) {
        return res.status(500).json({
          success: false,
          message:
            "Thiếu cấu hình MoMo (MOMO_PARTNER_CODE/MOMO_ACCESS_KEY/MOMO_SECRET_KEY/MOMO_CREATE_ENDPOINT).",
        });
      }
      const payType = String(type || "deposit");
      if (!["deposit", "balance"].includes(payType)) {
        return res.status(400).json({ success: false, message: "type must be deposit|balance" });
      }

      const booking = await Booking.findById(bookingId)
        .populate("room_id", "name price")
        .populate("room_type_id", "name price");

      if (!booking) {
        return res.status(404).json({
          success: false,
          message: "Không tìm thấy booking",
        });
      }

      const roomName =
        booking.room_type_id?.name || booking.room_id?.name || "Khách sạn";

      const orderId = `BOOK_${booking._id}_${Date.now()}`;
      let amount = 0;
      if (payType === "deposit") {
        const required = Math.max(0, Number(booking.deposit_amount) || 0);
        const paid = Math.max(0, Number(booking.deposit_paid_amount) || 0);
        amount = Math.max(0, required - paid);
      } else {
        // Balance payment: primarily used after checkout; keep legacy fallback
        const total = Math.max(0, Number(booking.total_price) || 0);
        const prepaid = Math.max(0, Number(booking.prepaid_amount) || 0);
        amount = Math.max(0, total - prepaid);
      }

      const finalAmount = Math.round(amount);
      if (amount <= 0) {
        return res.status(400).json({
          success: false,
          message: "Số tiền thanh toán không hợp lệ (không còn số dư cần thanh toán)",
        });
      }
      const orderInfo = momoAsciiOrderInfo(roomName, String(booking._id));

      const requestId = Date.now().toString();

      // ✅ QUAN TRỌNG: callback phải là BACKEND
      const redirectUrl =
        process.env.MOMO_REDIRECT_URL ||
        "http://localhost:3000/api/momo/callback";

      const ipnUrl =
        process.env.MOMO_IPN_URL || "http://localhost:3000/api/momo/ipn";

      const allowedRequestTypes = new Set(["captureWallet", "payWithATM", "payWithCC"]);
      if (
        requestTypeFromClient &&
        !allowedRequestTypes.has(String(requestTypeFromClient))
      ) {
        return res.status(400).json({
          success: false,
          message:
            "requestType không hợp lệ. Hỗ trợ: captureWallet (ví MoMo/QR), payWithATM, payWithCC",
        });
      }
      const requestType = requestTypeFromClient || this.requestType;

      // MoMo yêu cầu extraData là base64; signature phải dùng đúng cùng chuỗi extraData
      const extraDataObj = { bookingId: String(booking._id), type: payType };
      const extraData = Buffer.from(JSON.stringify(extraDataObj), "utf8").toString("base64");

      const tx = await PaymentTransaction.create({
        booking_id: booking._id,
        provider: "momo",
        type: payType,
        amount: finalAmount,
        status: "created",
        provider_order_id: orderId,
        provider_payload: { requestType },
      });

      const rawSignature =
        `accessKey=${this.accessKey}` +
        `&amount=${finalAmount}` +
        `&extraData=${extraData}` +
        `&ipnUrl=${ipnUrl}` +
        `&orderId=${orderId}` +
        `&orderInfo=${orderInfo}` +
        `&partnerCode=${this.partnerCode}` +
        `&redirectUrl=${redirectUrl}` +
        `&requestId=${requestId}` +
        `&requestType=${requestType}`;

      const signature = crypto
        .createHmac("sha256", this.secretKey)
        .update(rawSignature)
        .digest("hex");

      const requestBody = {
        partnerCode: this.partnerCode,
        partnerName: "Hotel Booking",
        storeId: "HotelStore",
        requestId,
        amount: finalAmount,
        orderId,
        orderInfo,
        redirectUrl,
        ipnUrl,
        lang: "vi",
        extraData,
        requestType,
        signature,
      };

      /**
       * captureWallet / QR: không gửi userInfo mặc định — SĐT trên booking thường là
       * số thật chưa có trong ví MoMo test, sandbox dễ báo "người dùng không tồn tại".
       * ATM/CC vẫn gửi (điền form). Bật userInfo cho QR: MOMO_ATTACH_USER_INFO_CAPTURE_WALLET=true
       */
      const userInfoForQr =
        requestType === "captureWallet" &&
        String(process.env.MOMO_ATTACH_USER_INFO_CAPTURE_WALLET || "").toLowerCase() === "true";
      const shouldAttachUserInfo = requestType !== "captureWallet" || userInfoForQr;
      if (shouldAttachUserInfo) {
        const ph = normalizeVnMobile(booking.guest_phone);
        const em = String(booking.guest_email || "").trim();
        const nm = String(booking.guest_name || "").trim();
        const userInfo = {};
        if (ph) userInfo.phoneNumber = ph;
        if (em && em.includes("@")) userInfo.email = em.slice(0, 255);
        if (nm) userInfo.name = nm.slice(0, 255);
        if (Object.keys(userInfo).length > 0) {
          requestBody.userInfo = userInfo;
        }
      }

      let response;
      let lastError;
      /** Chờ giữa các lần thử chỉ áp cho lỗi mạng/5xx — tránh chờ ~3.7s thừa khi sandbox MoMo báo lỗi hoặc 4xx */
      const retryDelays = [0, 400, 1000];

      /**
       * @param {unknown} err
       * @returns {boolean}
       */
      const isTransientNetworkError = (err) => {
        const ax = /** @type {{ code?: string, response?: { status?: number }}} */ (err);
        const st = Number(ax?.response?.status || 0);
        const code = String(ax?.code || "");
        return (
          st === 0 ||
          st >= 502 ||
          code === "ECONNABORTED" ||
          code === "ECONNRESET" ||
          code === "ETIMEDOUT" ||
          code === "ECONNREFUSED"
        );
      };

      for (let i = 0; i < retryDelays.length; i++) {
        const delayMs = retryDelays[i];
        if (delayMs > 0) await new Promise((r) => setTimeout(r, delayMs));
        try {
          response = await axios.post(this.createEndpoint, requestBody, {
            // 18s đủ cho MoMo sandbox; giảm cảm giác treo vs 25s+
            timeout: 18000,
          });
          lastError = null;
          break;
        } catch (err) {
          lastError = err;
          const isTransient = isTransientNetworkError(err);
          if (!isTransient || i === retryDelays.length - 1) break;
        }
      }

      if (!response) {
        throw lastError || new Error("Không thể kết nối cổng thanh toán MoMo");
      }

      const result = response.data;

      if (result.resultCode === 0 && result.payUrl) {
        return res.json({
          success: true,
          payUrl: result.payUrl,
          orderId,
          transactionId: tx._id,
        });
      } else {
        console.error("MoMo Error:", result);
        await PaymentTransaction.findByIdAndUpdate(tx._id, {
          status: "failed",
          provider_message: String(result.message || ""),
          provider_payload: { ...tx.provider_payload, createResult: result },
        });
        return res.status(400).json({
          success: false,
          message: result.message || "Không tạo được link thanh toán",
        });
      }
    } catch (error) {
      console.error("MoMo Error:", error.response?.data || error.message);
      const upstreamStatus = Number(error?.response?.status || 0);
      const timedOut =
        error?.code === "ECONNABORTED" ||
        upstreamStatus === 504 ||
        /timeout/i.test(String(error?.message || ""));

      return res.status(timedOut ? 504 : 500).json({
        success: false,
        message: timedOut
          ? "Cổng thanh toán đang bận hoặc hết thời gian phản hồi, vui lòng thử lại sau."
          : "Không tạo được link thanh toán MoMo. Vui lòng kiểm tra cấu hình MoMo và thử lại.",
      });
    }
  };

  callback = async (req, res) => {
    console.log("MoMo Callback query:", req.query);

    const { orderId, resultCode, message, transId } = req.query;

    try {
      if (!orderId) {
        return res.redirect(
          `${process.env.FRONTEND_URL}/payment-failed?message=Thiếu orderId&resultCode=${encodeURIComponent(
            String(resultCode ?? ""),
          )}`,
        );
      }

      const idMatch = String(orderId).match(/^BOOK_([a-fA-F0-9]{24})_/);
      const bookingId = idMatch?.[1];
      if (!bookingId) {
        return res.redirect(
          `${process.env.FRONTEND_URL}/payment-failed?message=orderId không hợp lệ&resultCode=${encodeURIComponent(
            String(resultCode ?? ""),
          )}`,
        );
      }

      const booking = await Booking.findById(bookingId);

      if (!booking) {
        return res.redirect(
          `${process.env.FRONTEND_URL}/payment-failed?message=Không tìm thấy booking&resultCode=${encodeURIComponent(
            String(resultCode ?? ""),
          )}`,
        );
      }

      const isSuccess = Number(resultCode) === 0;

      if (isSuccess) {
        // Local-only mode commonly relies on redirect callback (browser) and may not receive IPN.
        // Make callback signature verification configurable (default: false for local).
        const shouldVerifyCallback =
          String(process.env.MOMO_VERIFY_CALLBACK_SIGNATURE || "false").toLowerCase() === "true";
        if (shouldVerifyCallback) {
          const ver = this.verifyResultSignature(req.query || {});
          if (!ver.ok) {
            await PaymentTransaction.findOneAndUpdate(
              { booking_id: booking._id, provider: "momo", provider_order_id: String(orderId) },
              {
                status: "failed",
                provider_trans_id: String(transId ?? ""),
                provider_message: `Invalid signature (callback): ${ver.err}`,
                provider_payload: { callbackQuery: req.query, signatureVerify: ver },
              },
            );
            return res.redirect(
              `${process.env.FRONTEND_URL}/payment-failed?message=${encodeURIComponent(
                "Chữ ký thanh toán không hợp lệ",
              )}&resultCode=${encodeURIComponent(String(resultCode ?? ""))}&orderId=${encodeURIComponent(
                String(orderId ?? ""),
              )}`,
            );
          }
        }

        // Idempotency: don't apply booking ledger twice when both callback + IPN hit.
        const existingTx = await PaymentTransaction.findOne({
          booking_id: booking._id,
          provider: "momo",
          provider_order_id: String(orderId),
        });
        const alreadySucceeded = String(existingTx?.status || "") === "succeeded";

        const tx = await PaymentTransaction.findOneAndUpdate(
          { booking_id: booking._id, provider: "momo", provider_order_id: String(orderId) },
          {
            status: "succeeded",
            provider_trans_id: String(transId ?? ""),
            provider_message: String(message || ""),
            provider_payload: {
              ...(existingTx?.provider_payload || {}),
              callbackQuery: req.query,
            },
          },
          { new: true },
        );

        const txType = String(tx?.type || "deposit");
        if (!alreadySucceeded) {
          if (txType === "deposit") {
            const inc = Math.max(0, Number(tx?.amount) || 0);
            booking.deposit_paid_amount = Math.max(0, Number(booking.deposit_paid_amount) || 0) + inc;
            booking.prepaid_amount = Math.max(0, Number(booking.prepaid_amount) || 0) + inc;
            const paidOk = isDepositSufficient({
              depositAmount: booking.deposit_amount,
              depositPaidAmount: booking.deposit_paid_amount,
            });
            booking.deposit_status = paidOk ? "paid" : "unpaid";
            // Policy: after payment, booking stays pending for admin confirmation
          } else if (txType === "balance") {
            const inc = Math.max(0, Number(tx?.amount) || 0);
            booking.prepaid_amount = Math.max(0, Number(booking.prepaid_amount) || 0) + inc;
            // If customer pays full upfront via "balance" at booking time:
            // - still count it toward deposit (capped by required deposit)
            // - confirm booking when deposit requirement is met
            const requiredDeposit = Math.max(0, Number(booking.deposit_amount) || 0);
            const currentDepositPaid = Math.max(0, Number(booking.deposit_paid_amount) || 0);
            const remainingDeposit = Math.max(0, requiredDeposit - currentDepositPaid);
            const depositInc = Math.min(remainingDeposit, inc);
            booking.deposit_paid_amount = currentDepositPaid + depositInc;
            const paidOk = isDepositSufficient({
              depositAmount: requiredDeposit,
              depositPaidAmount: booking.deposit_paid_amount,
            });
            booking.deposit_status = paidOk ? "paid" : booking.deposit_status;
            // Policy: after payment, booking stays pending for admin confirmation

            const total = Math.max(0, Number(booking.total_price) || 0);
            booking.is_paid = booking.prepaid_amount + 1 >= total;
          }
        }

        booking.payment_provider = booking.payment_provider || "momo";
        const tidSt = String(transId ?? "").trim();
        if (tidSt) booking.payment_transaction_id = tidSt;

        await booking.save();
        if (!alreadySucceeded) {
          await createNotification({
            userId: booking.user_id,
            bookingId: booking._id,
            type: "payment_success",
            title: "Thanh toán thành công",
            message: `Booking #${String(booking._id).slice(-6).toUpperCase()} đã thanh toán thành công. Trạng thái: ${booking.status}.`,
            eventKey: `payment_success_${booking._id}`,
          });
        }

        const paidAmount = Math.max(0, Number(tx?.amount) || 0);
        return res.redirect(
          `${process.env.FRONTEND_URL}/payment-success?bookingId=${booking._id}&orderId=${encodeURIComponent(
            orderId,
          )}&resultCode=${encodeURIComponent(String(resultCode ?? 0))}&transId=${encodeURIComponent(
            String(transId ?? ""),
          )}&paidAmount=${encodeURIComponent(String(paidAmount))}&payType=${encodeURIComponent(String(txType))}`,
        );
      } else {
        await PaymentTransaction.findOneAndUpdate(
          { booking_id: booking._id, provider: "momo", provider_order_id: String(orderId) },
          {
            status: "failed",
            provider_trans_id: String(transId ?? ""),
            provider_message: String(message || ""),
            provider_payload: { callbackQuery: req.query },
          },
        );
        booking.is_paid = false;
        // Keep pending; cancellation/refund is handled by policy/admin endpoints.
        await booking.save();
        return res.redirect(
          `${process.env.FRONTEND_URL}/payment-failed?message=${encodeURIComponent(
            message || "Thanh toán thất bại",
          )}&resultCode=${encodeURIComponent(String(resultCode ?? ""))}&orderId=${encodeURIComponent(
            String(orderId ?? ""),
          )}&transId=${encodeURIComponent(String(transId ?? ""))}`,
        );
      }
    } catch (error) {
      console.error("Callback Error:", error);

      return res.redirect(
        `${process.env.FRONTEND_URL}/payment-failed?message=Lỗi server&resultCode=${encodeURIComponent(
          String(resultCode ?? ""),
        )}`,
      );
    }
  };

  ipn = async (req, res) => {
    try {
      const { orderId, resultCode } = req.body || {};

      if (!orderId) {
        return res.status(400).json({
          success: false,
          message: "Thiếu orderId",
        });
      }

      // IPN is server-to-server. In local-only setups, MoMo cannot reach localhost.
      // Keep verification configurable for deployments; default true.
      const shouldVerifyIpn =
        String(process.env.MOMO_VERIFY_IPN_SIGNATURE || "true").toLowerCase() === "true";
      let ver = { ok: true, err: "" };
      if (shouldVerifyIpn) {
        ver = this.verifyResultSignature(req.body || {});
        if (!ver.ok) {
          return res.status(400).json({ success: false, message: "Invalid signature" });
        }
        if (String(req.body?.partnerCode || "") !== String(this.partnerCode || "")) {
          return res.status(400).json({ success: false, message: "partnerCode mismatch" });
        }
      }

      const idMatch = String(orderId).match(/^BOOK_([a-fA-F0-9]{24})_/);
      const bookingId = idMatch?.[1];
      if (!bookingId) {
        return res.status(400).json({
          success: false,
          message: "orderId không hợp lệ",
        });
      }

      const booking = await Booking.findById(bookingId);
      if (!booking) {
        return res.status(404).json({
          success: false,
          message: "Không tìm thấy booking",
        });
      }

      const isSuccess = Number(resultCode) === 0;
      const existingTx = await PaymentTransaction.findOne({
        booking_id: booking._id,
        provider: "momo",
        provider_order_id: String(orderId),
      });
      const alreadySucceeded = String(existingTx?.status || "") === "succeeded";

      const tx = await PaymentTransaction.findOneAndUpdate(
        { booking_id: booking._id, provider: "momo", provider_order_id: String(orderId) },
        {
          status: isSuccess ? "succeeded" : "failed",
          provider_trans_id: String(req.body?.transId || ""),
          provider_message: String(req.body?.message || ""),
          provider_payload: { ...(existingTx?.provider_payload || {}), ipnBody: req.body, signatureVerify: shouldVerifyIpn ? ver : null },
        },
        { new: true, upsert: false },
      );

      if (isSuccess && !alreadySucceeded) {
        const txType = String(tx?.type || "deposit");
        const inc = Math.max(0, Number(tx?.amount) || 0);
        booking.prepaid_amount = Math.max(0, Number(booking.prepaid_amount) || 0) + inc;

        if (txType === "deposit") {
          booking.deposit_paid_amount = Math.max(0, Number(booking.deposit_paid_amount) || 0) + inc;
          const paidOk = isDepositSufficient({
            depositAmount: booking.deposit_amount,
            depositPaidAmount: booking.deposit_paid_amount,
          });
          booking.deposit_status = paidOk ? "paid" : "unpaid";
          // Policy: after payment, booking stays pending for admin confirmation
        } else if (txType === "balance") {
          const requiredDeposit = Math.max(0, Number(booking.deposit_amount) || 0);
          const currentDepositPaid = Math.max(0, Number(booking.deposit_paid_amount) || 0);
          const remainingDeposit = Math.max(0, requiredDeposit - currentDepositPaid);
          const depositInc = Math.min(remainingDeposit, inc);
          booking.deposit_paid_amount = currentDepositPaid + depositInc;
          const paidOk = isDepositSufficient({
            depositAmount: requiredDeposit,
            depositPaidAmount: booking.deposit_paid_amount,
          });
          booking.deposit_status = paidOk ? "paid" : booking.deposit_status;
          // Policy: after payment, booking stays pending for admin confirmation

          const total = Math.max(0, Number(booking.total_price) || 0);
          booking.is_paid = booking.prepaid_amount + 1 >= total;
        }

        booking.payment_provider = booking.payment_provider || "momo";
        const ipnTid = String(req.body?.transId || "").trim();
        if (ipnTid) booking.payment_transaction_id = ipnTid;

        await booking.save();
      } else if (!isSuccess) {
        booking.is_paid = false;
        await booking.save();
      }

      // MoMo khuyến nghị trả 204 trong 15s để dừng retry IPN
      return res.status(204).send();
    } catch (error) {
      console.error("MoMo IPN Error:", error);
      return res.status(500).json({
        success: false,
        message: "Lỗi IPN",
      });
    }
  };
}

export default new MoMoController();
