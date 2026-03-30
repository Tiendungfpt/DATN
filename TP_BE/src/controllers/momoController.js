import axios from "axios";
import crypto from "crypto";
import Booking from "../models/Booking";
import dotenv from "dotenv";

dotenv.config();

class MoMoController {
  constructor() {
    this.partnerCode = process.env.MOMO_PARTNER_CODE || "MOMOBKUN20180529";
    this.accessKey = process.env.MOMO_ACCESS_KEY || "klm05TvNBzhg7h7j";
    this.secretKey =
      process.env.MOMO_SECRET_KEY || "at67qH6mk8w5Y1nAyMoYKMWACiEi2bsa";

    this.createEndpoint = "https://test-payment.momo.vn/v2/gateway/api/create";
    this.queryEndpoint = "https://test-payment.momo.vn/v2/gateway/api/query";
  }

  createPayment = async (req, res) => {
    try {
      const { bookingId } = req.body;

      if (!bookingId) {
        return res
          .status(400)
          .json({ success: false, message: "Thiếu bookingId" });
      }

      const booking = await Booking.findById(bookingId)
        .populate("roomId", "name price")
        .populate("userId", "name email");

      if (!booking) {
        return res
          .status(404)
          .json({ success: false, message: "Không tìm thấy booking" });
      }

      if (booking.paymentStatus === "paid") {
        return res
          .status(400)
          .json({ success: false, message: "Booking này đã được thanh toán" });
      }

      const orderId = `BOOK_${booking._id.toString().slice(-8)}_${Date.now()}`;
      const amount = Math.round(booking.totalPrice); // MoMo yêu cầu số nguyên
      const orderInfo = `Thanh toán đặt phòng ${booking.roomId?.name || "Khách sạn"} - #${booking._id}`;

      const requestId = Date.now().toString();
      const redirectUrl =
        process.env.MOMO_REDIRECT_URL ||
        `${process.env.BASE_URL}/api/momo/callback`;
      const ipnUrl =
        process.env.MOMO_IPN_URL || `${process.env.BASE_URL}/api/momo/ipn`;
      const requestType = "payWithATM";

      const rawSignature =
        `accessKey=${this.accessKey}` +
        `&amount=${amount}` +
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
        amount: amount.toString(),
        orderId,
        orderInfo,
        redirectUrl,
        ipnUrl,
        lang: "vi",
        extraData: "",
        requestType,
        signature,
      };

      const response = await axios.post(this.createEndpoint, requestBody, {
        timeout: 30000,
      });

      const result = response.data;

      if (result.resultCode === 0 && result.payUrl) {
        // Lưu orderId để callback và IPN nhận diện
        booking.transactionId = orderId;
        booking.paymentMethod = "momo";
        await booking.save();

        return res.json({
          success: true,
          payUrl: result.payUrl,
          orderId,
          bookingId: booking._id,
          deeplink: result.deeplink || null,
          qrCodeUrl: result.qrCodeUrl || null,
        });
      } else {
        console.error("MoMo Error:", result);
        return res.status(400).json({
          success: false,
          message: result.message || "Không thể tạo link thanh toán",
          resultCode: result.resultCode,
        });
      }
    } catch (error) {
      console.error(
        "Create MoMo Payment Error:",
        error.response?.data || error.message,
      );
      return res.status(500).json({
        success: false,
        message: "Lỗi server khi tạo thanh toán MoMo",
      });
    }
  };

  callback = async (req, res) => {
    console.log("MoMo Callback:", req.body || req.query);

    const { orderId, resultCode, message, transId } =
      req.body || req.query || {};

    try {
      const booking = await Booking.findOne({ transactionId: orderId });

      if (!booking) {
        return res.redirect(
          `${process.env.FRONTEND_URL}/payment-failed?message=Không tìm thấy booking`,
        );
      }

      if (resultCode === "0" || resultCode === 0) {
        booking.paymentStatus = "paid";
        booking.status = "confirmed";
        booking.transactionId = transId || orderId;
        await booking.save();

        return res.redirect(
          `${process.env.FRONTEND_URL}/payment-success?bookingId=${booking._id}`,
        );
      } else {
        return res.redirect(
          `${process.env.FRONTEND_URL}/payment-failed?message=${encodeURIComponent(message || "Thanh toán thất bại")}`,
        );
      }
    } catch (error) {
      console.error("Callback Error:", error);
      return res.redirect(`${process.env.FRONTEND_URL}/payment-failed`);
    }
  };

  ipn = async (req, res) => {
    console.log("MoMo IPN received:", req.body);

    const { orderId, resultCode, transId } = req.body;

    if (resultCode === "0" || resultCode === 0) {
      const booking = await Booking.findOne({ transactionId: orderId });
      if (booking && booking.paymentStatus !== "paid") {
        booking.paymentStatus = "paid";
        booking.status = "confirmed";
        booking.transactionId = transId;
        await booking.save();
        console.log(
          `Cập nhật thanh toán thành công cho booking: ${booking._id}`,
        );
      }
    }

    return res.json({ message: "success" });
  };

  queryTransaction = async (req, res) => {
    const { orderId } = req.params;

    try {
      const requestId = Date.now().toString();

      const rawSignature =
        `accessKey=${this.accessKey}` +
        `&orderId=${orderId}` +
        `&partnerCode=${this.partnerCode}` +
        `&requestId=${requestId}`;

      const signature = crypto
        .createHmac("sha256", this.secretKey)
        .update(rawSignature)
        .digest("hex");

      const data = {
        partnerCode: this.partnerCode,
        requestId,
        orderId,
        signature,
        lang: "vi",
      };

      const response = await axios.post(this.queryEndpoint, data);
      res.json(response.data);
    } catch (error) {
      console.error("Query MoMo Error:", error.message);
      res.status(500).json({ message: "Lỗi khi kiểm tra giao dịch" });
    }
  };
}

export default new MoMoController();
