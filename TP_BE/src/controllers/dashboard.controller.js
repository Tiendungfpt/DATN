import Booking from "../models/Booking.js";
import Room from "../models/rooms.js";
import {
  startOfDay,
  endOfDay,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  addDays,
} from "date-fns";

export const getDashboardStats = async (req, res) => {
  try {
    const { period = "today" } = req.query;
    const now = new Date();

    let startDate, endDate;

    switch (period) {
      case "today":
        startDate = startOfDay(now);
        endDate = endOfDay(now);
        break;

      case "week":
        startDate = startOfWeek(now, { weekStartsOn: 1 }); // Thứ 2
        endDate = endOfWeek(now, { weekStartsOn: 1 });
        break;

      case "month":
        startDate = startOfMonth(now);
        endDate = endOfMonth(now);
        break;

      default:
        return res.status(400).json({
          success: false,
          message: "Period không hợp lệ (today, week, month)",
        });
    }

    // ====================== QUERY BOOKING CHỒNG CHÉO ĐÚNG ======================
    const bookings = await Booking.find({
      status: "confirmed",
      paymentStatus: "paid",
    });

    // Tổng số phòng khả dụng
    const totalRooms = await Room.countDocuments({ status: "available" });

    let totalRevenue = 0;
    let totalBookings = bookings.length;
    let totalRoomNights = 0;

    bookings.forEach((booking) => {
      totalRevenue += Number(booking.totalPrice) || 0;

      const checkIn = new Date(booking.checkInDate);
      const checkOut = new Date(booking.checkOutDate);

      // Tính số đêm thực tế của booking
      const nights = Math.max(
        1,
        Math.ceil((checkOut - checkIn) / (1000 * 60 * 60 * 24)),
      );

      totalRoomNights += nights * (booking.rooms?.length || 1);
    });

    // ====================== TÍNH OCCUPANCY, ADR, REVPAR ======================
    // Số ngày trong kỳ
    const daysInPeriod =
      Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24)) || 1;

    const totalAvailableRoomNights = totalRooms * daysInPeriod;

    const occupancyRate =
      totalAvailableRoomNights > 0
        ? Math.round((totalRoomNights / totalAvailableRoomNights) * 100)
        : 0;

    const adr =
      totalRoomNights > 0 ? Math.round(totalRevenue / totalRoomNights) : 0;

    const revpar =
      totalAvailableRoomNights > 0
        ? Math.round(totalRevenue / totalAvailableRoomNights)
        : 0;

    // Format tiền Việt Nam
    const formatCurrency = (amount) => {
      return Math.round(amount).toLocaleString("vi-VN");
    };

    const stats = {
      revenue: formatCurrency(totalRevenue),
      bookings: totalBookings,
      occupancy: occupancyRate,
      adr: formatCurrency(adr),
      revpar: formatCurrency(revpar),
    };

    res.status(200).json({
      success: true,
      period,
      stats,
      totalRooms,
      totalRoomNights,
      daysInPeriod,
      dateRange: {
        start: startDate.toISOString().split("T")[0],
        end: endDate.toISOString().split("T")[0],
      },
    });
  } catch (error) {
    console.error("Get dashboard stats error:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi server khi lấy thống kê: " + error.message,
    });
  }
};
