import Booking from "../models/Booking.js";
import Room from "../models/rooms.js";
import User from "../models/User.js";
import {
  startOfDay,
  endOfDay,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  subDays,
} from "date-fns";

export const getDashboardStats = async (req, res) => {
  try {
    const { period = "today" } = req.query;
    const now = new Date();

    let startDate, endDate, prevStart, prevEnd;

    // ===== DEFINE PERIOD =====
    switch (period) {
      case "today":
        startDate = startOfDay(now);
        endDate = endOfDay(now);

        prevStart = startOfDay(subDays(now, 1));
        prevEnd = endOfDay(subDays(now, 1));
        break;

      case "week":
        startDate = startOfWeek(now, { weekStartsOn: 1 });
        endDate = endOfWeek(now, { weekStartsOn: 1 });

        prevStart = startOfWeek(subDays(now, 7), { weekStartsOn: 1 });
        prevEnd = endOfWeek(subDays(now, 7), { weekStartsOn: 1 });
        break;

      case "month":
        startDate = startOfMonth(now);
        endDate = endOfMonth(now);

        prevStart = startOfMonth(subDays(now, 30));
        prevEnd = endOfMonth(subDays(now, 30));
        break;

      default:
        return res.status(400).json({ message: "Invalid period" });
    }

    // ===== BOOKING QUERY (OVERLAP) =====
    const currentBookings = await Booking.find({
      status: "confirmed",
      paymentStatus: "paid",
      checkInDate: { $lte: endDate },
      checkOutDate: { $gte: startDate },
    });

    const prevBookings = await Booking.find({
      status: "confirmed",
      paymentStatus: "paid",
      checkInDate: { $lte: prevEnd },
      checkOutDate: { $gte: prevStart },
    });

    // ===== TOTAL DATA =====
    const totalRooms = await Room.countDocuments();
    const totalUsers = await User.countDocuments();

    // ===== CALCULATE =====
    const calculateMetrics = (bookings, start, end) => {
      let revenue = 0;
      let roomNights = 0;

      bookings.forEach((b) => {
        const checkIn = new Date(b.checkInDate);
        const checkOut = new Date(b.checkOutDate);

        // Giới hạn trong period
        const actualStart = checkIn < start ? start : checkIn;
        const actualEnd = checkOut > end ? end : checkOut;

        const totalNights = Math.max(
          1,
          Math.ceil((checkOut - checkIn) / (1000 * 60 * 60 * 24))
        );

        const usedNights = Math.max(
          1,
          Math.ceil((actualEnd - actualStart) / (1000 * 60 * 60 * 24))
        );

        const pricePerNight = (b.totalPrice || 0) / totalNights;

        revenue += usedNights * pricePerNight;
        roomNights += usedNights * (b.rooms?.length || 1);
      });

      const days =
        Math.ceil((end - start) / (1000 * 60 * 60 * 24)) || 1;

      const available = totalRooms * days;

      return {
        revenue,
        bookings: bookings.length,
        roomNights,
        occupancy: available ? (roomNights / available) * 100 : 0,
        adr: roomNights ? revenue / roomNights : 0,
        revpar: available ? revenue / available : 0,
      };
    };

    const current = calculateMetrics(currentBookings, startDate, endDate);
    const previous = calculateMetrics(prevBookings, prevStart, prevEnd);

    // ===== GROWTH % =====
    const growth = (cur, prev) => {
      if (!prev) return 100;
      return ((cur - prev) / prev) * 100;
    };

    const format = (n) => Math.round(n).toLocaleString("vi-VN");

    // ===== RESPONSE =====
    res.json({
      success: true,
      period,

      totals: {
        rooms: totalRooms,
        users: totalUsers,

      },

      stats: {
        revenue: format(current.revenue),
        bookings: current.bookings,
        occupancy: Math.round(current.occupancy),
        adr: format(current.adr),
        revpar: format(current.revpar),
      },

      growth: {
        revenue: Math.round(growth(current.revenue, previous.revenue)),
        bookings: Math.round(growth(current.bookings, previous.bookings)),
        occupancy: Math.round(growth(current.occupancy, previous.occupancy)),
      },

      dateRange: {
        from: startDate,
        to: endDate,
      },
    });
  } catch (err) {
    console.error("Dashboard error:", err);
    res.status(500).json({ message: err.message });
  }
};