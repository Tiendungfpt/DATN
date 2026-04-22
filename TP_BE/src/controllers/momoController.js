import axios from "axios";
import crypto from "crypto";
import Booking from "../models/Booking.js";
import PaymentTransaction from "../models/PaymentTransaction.js";
import dotenv from "dotenv";
import { createNotification } from "../utils/notification.js";
import { isDepositSufficient } from "../utils/bookingPolicy.js";

dotenv.config();

class MoMoController {
  constructor() {
    this.partnerCode = process.env.MOMO_PARTNER_CODE;
    this.accessKey = process.env.MOMO_ACCESS_KEY;
    this.secretKey = process.env.MOMO_SECRET_KEY;

    this.createEndpoint = process.env.MOMO_CREATE_ENDPOINT;
    this.queryEndpoint = process.env.MOMO_QUERY_ENDPOINT;
    this.requestType = process.env.MOMO_REQUEST_TYPE || "payWithATM";
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
      const orderInfo = `Thanh toán phòng ${roomName} - ${booking._id}`;

      const requestId = Date.now().toString();

      // ✅ QUAN TRỌNG: callback phải là BACKEND
      const redirectUrl =
        process.env.MOMO_REDIRECT_URL ||
        "http://localhost:3000/api/momo/callback";

      const ipnUrl =
        process.env.MOMO_IPN_URL || "http://localhost:3000/api/momo/ipn";

      const allowedRequestTypes = new Set(["payWithATM", "payWithCC"]);
      if (
        requestTypeFromClient &&
        !allowedRequestTypes.has(String(requestTypeFromClient))
      ) {
        return res.status(400).json({
          success: false,
          message: "requestType không hợp lệ. Chỉ hỗ trợ payWithATM hoặc payWithCC",
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
        amount: finalAmount.toString(),
        orderId,
        orderInfo,
        redirectUrl,
        ipnUrl,
        lang: "vi",
        extraData,
        requestType,
        signature,
      };

      let response;
      let lastError;
      const retryDelays = [0, 1200, 2500];

      for (const delayMs of retryDelays) {
        if (delayMs > 0) {
          await new Promise((resolve) => setTimeout(resolve, delayMs));
        }
        try {
          response = await axios.post(this.createEndpoint, requestBody, {
            timeout: 25000,
          });
          lastError = null;
          break;
        } catch (err) {
          lastError = err;
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
        const tx = await PaymentTransaction.findOneAndUpdate(
          { booking_id: booking._id, provider: "momo", provider_order_id: String(orderId) },
          {
            status: "succeeded",
            provider_trans_id: String(transId ?? ""),
            provider_message: String(message || ""),
            provider_payload: { callbackQuery: req.query },
          },
          { new: true },
        );

        const txType = String(tx?.type || "deposit");
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

        await booking.save();
        await createNotification({
          userId: booking.user_id,
          bookingId: booking._id,
          type: "payment_success",
          title: "Thanh toán thành công",
          message: `Booking #${String(booking._id).slice(-6).toUpperCase()} đã thanh toán thành công. Trạng thái: ${booking.status}.`,
          eventKey: `payment_success_${booking._id}`,
        });

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
      const tx = await PaymentTransaction.findOneAndUpdate(
        { booking_id: booking._id, provider: "momo", provider_order_id: String(orderId) },
        {
          status: isSuccess ? "succeeded" : "failed",
          provider_trans_id: String(req.body?.transId || ""),
          provider_message: String(req.body?.message || ""),
          provider_payload: { ipnBody: req.body },
        },
        { new: true },
      );

      if (isSuccess) {
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

        await booking.save();
      } else if (!isSuccess) {
        booking.is_paid = false;
        await booking.save();
      }

      return res.json({ success: true });
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
