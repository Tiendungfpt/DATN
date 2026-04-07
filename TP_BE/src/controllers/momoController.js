import axios from "axios";
import crypto from "crypto";
import Booking from "../models/Booking.js";
import dotenv from "dotenv";
import { createNotification } from "../utils/notification.js";

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
      const { bookingId, requestType: requestTypeFromClient } = req.body;

      if (!bookingId) {
        return res.status(400).json({
          success: false,
          message: "Thiếu bookingId",
        });
      }

      const booking = await Booking.findById(bookingId).populate(
        "room_id",
        "name price",
      );

      if (!booking) {
        return res.status(404).json({
          success: false,
          message: "Không tìm thấy booking",
        });
      }

      const roomName = booking.room_id?.name || "Khách sạn";

      const orderId = `BOOK_${booking._id}_${Date.now()}`;
      const amount =
  booking.total_price ||
  booking.total ||
  booking.room_id?.price ||
  0;

const finalAmount = Math.round(amount);
      if (amount <= 0) {
        return res.status(400).json({
          success: false,
          message: "Số tiền booking không hợp lệ",
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

      const rawSignature =
        `accessKey=${this.accessKey}` +
        `&amount=${finalAmount}` +
        `&extraData=` +
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
        extraData: "",
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
        });
      } else {
        console.error("MoMo Error:", result);
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
          : error.response?.data?.message || error.message,
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
        // Thanh toán thành công nhưng vẫn chờ admin xác nhận.
        booking.status = "pending";
        await booking.save();
        await createNotification({
          userId: booking.user_id,
          bookingId: booking._id,
          type: "payment_success",
          title: "Thanh toán thành công",
          message: `Booking #${String(booking._id).slice(-6).toUpperCase()} đã thanh toán thành công và đang chờ admin xác nhận phòng.`,
          eventKey: `payment_success_${booking._id}`,
        });

        return res.redirect(
          `${process.env.FRONTEND_URL}/payment-success?bookingId=${booking._id}&orderId=${encodeURIComponent(
            orderId,
          )}&resultCode=${encodeURIComponent(String(resultCode ?? 0))}&transId=${encodeURIComponent(
            String(transId ?? ""),
          )}`,
        );
      } else {
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

      if (Number(resultCode) === 0) {
        booking.status = "pending";
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
