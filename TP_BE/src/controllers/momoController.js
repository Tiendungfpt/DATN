import axios from "axios";
import crypto from "crypto";
import Booking from "../models/Booking";
import dotenv from "dotenv";

dotenv.config();

class MoMoController {
  constructor() {
    this.partnerCode = process.env.MOMO_PARTNER_CODE;
    this.accessKey = process.env.MOMO_ACCESS_KEY;
    this.secretKey = process.env.MOMO_SECRET_KEY;

    this.createEndpoint = process.env.MOMO_CREATE_ENDPOINT;
    this.queryEndpoint = process.env.MOMO_QUERY_ENDPOINT;
  }

  createPayment = async (req, res) => {
    try {
      const { bookingId } = req.body;

      if (!bookingId) {
        return res.status(400).json({
          success: false,
          message: "Thiếu bookingId",
        });
      }

      const booking = await Booking.findById(bookingId)
        .populate("rooms", "name price")
        .populate("userId", "name email");

      if (!booking) {
        return res.status(404).json({
          success: false,
          message: "Không tìm thấy booking",
        });
      }

      if (booking.paymentStatus === "paid") {
        return res.status(400).json({
          success: false,
          message: "Booking đã thanh toán",
        });
      }

      // ✅ FIX: lấy tên phòng đúng (vì bạn dùng rooms array)
      const roomName = booking.rooms?.[0]?.name || "Khách sạn";

      const orderId = `BOOK_${booking._id}_${Date.now()}`;
      const amount = Math.round(booking.totalPrice);
      const orderInfo = `Thanh toán phòng ${roomName} - ${booking._id}`;

      const requestId = Date.now().toString();

      // ✅ QUAN TRỌNG: callback phải là BACKEND
      const redirectUrl =
        process.env.MOMO_REDIRECT_URL ||
        "http://localhost:3000/api/momo/callback";

      const ipnUrl =
        process.env.MOMO_IPN_URL || "http://localhost:3000/api/momo/ipn";

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

      const response = await axios.post(this.createEndpoint, requestBody);

      const result = response.data;

      if (result.resultCode === 0 && result.payUrl) {
        // lưu transaction
        booking.transactionId = orderId;
        booking.paymentMethod = "momo";
        await booking.save();

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
      return res.status(500).json({
        success: false,
        message: "Lỗi server",
      });
    }
  };

  callback = async (req, res) => {
    console.log("MoMo Callback query:", req.query);

    const { orderId, resultCode, message, transId } = req.query;

    try {
      if (!orderId) {
        return res.redirect(
          `${process.env.FRONTEND_URL}/payment-failed?message=Thiếu orderId`,
        );
      }

      const booking = await Booking.findOne({ transactionId: orderId });

      if (!booking) {
        return res.redirect(
          `${process.env.FRONTEND_URL}/payment-failed?message=Không tìm thấy booking`,
        );
      }

      const isSuccess = Number(resultCode) === 0;

      if (isSuccess) {
        booking.paymentStatus = "paid";
        booking.status = "confirmed";
        booking.transactionId = transId || orderId;

        await booking.save();

        return res.redirect(
          `${process.env.FRONTEND_URL}/payment-success?bookingId=${booking._id}`,
        );
      } else {
        return res.redirect(
          `${process.env.FRONTEND_URL}/payment-failed?message=${encodeURIComponent(
            message || "Thanh toán thất bại",
          )}`,
        );
      }
    } catch (error) {
      console.error("Callback Error:", error);

      return res.redirect(
        `${process.env.FRONTEND_URL}/payment-failed?message=Lỗi server`,
      );
    }
  };
}

export default new MoMoController();
