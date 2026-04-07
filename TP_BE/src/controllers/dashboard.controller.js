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
  startOfYear,
  endOfYear,
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
    // Booking schema uses snake_case fields in this project.
    const validRevenueStatuses = ["confirmed", "checked_in", "completed"];

    const currentBookings = await Booking.find({
      status: { $in: validRevenueStatuses },
      check_in_date: { $lte: endDate },
      check_out_date: { $gte: startDate },
    });

    const prevBookings = await Booking.find({
      status: { $in: validRevenueStatuses },
      check_in_date: { $lte: prevEnd },
      check_out_date: { $gte: prevStart },
    });

    // ===== TOTAL DATA =====
    const totalRooms = await Room.countDocuments();
    const totalUsers = await User.countDocuments();

    // ===== CALCULATE =====
    const calculateMetrics = (bookings, start, end) => {
      let revenue = 0;
      let roomNights = 0;

      bookings.forEach((b) => {
        const checkIn = new Date(b.check_in_date);
        const checkOut = new Date(b.check_out_date);

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

        const pricePerNight = (b.total_price || 0) / totalNights;

        revenue += usedNights * pricePerNight;
        roomNights += usedNights * (b.room_quantity || 1);
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

    // ===== REVENUE OVERVIEW (TOTAL + MONTHLY + WEEKLY IN CURRENT MONTH) =====
    const allRevenueBookings = await Booking.find({
      status: { $in: validRevenueStatuses },
    }).select("total_price check_in_date");

    const totalRevenueValue = allRevenueBookings.reduce(
      (sum, b) => sum + Number(b.total_price || 0),
      0,
    );

    const yearStart = startOfYear(now);
    const yearEnd = endOfYear(now);
    const yearBookings = allRevenueBookings.filter((b) => {
      const checkIn = new Date(b.check_in_date);
      return checkIn >= yearStart && checkIn <= yearEnd;
    });

    const monthlyTotals = Array.from({ length: 12 }, () => 0);
    yearBookings.forEach((b) => {
      const month = new Date(b.check_in_date).getMonth(); // 0..11
      monthlyTotals[month] += Number(b.total_price || 0);
    });

    const monthlyRevenueChart = monthlyTotals.map((value, idx) => ({
      month: `T${idx + 1}`,
      revenue: Math.round(value),
      revenueFormatted: format(value),
    }));

    const currentMonthStart = startOfMonth(now);
    const currentMonthEnd = endOfMonth(now);
    const currentMonthBookings = allRevenueBookings.filter((b) => {
      const checkIn = new Date(b.check_in_date);
      return checkIn >= currentMonthStart && checkIn <= currentMonthEnd;
    });

    const weeklyBuckets = [0, 0, 0, 0, 0];
    currentMonthBookings.forEach((b) => {
      const day = new Date(b.check_in_date).getDate();
      let weekIdx = 4;
      if (day <= 7) weekIdx = 0;
      else if (day <= 14) weekIdx = 1;
      else if (day <= 21) weekIdx = 2;
      else if (day <= 28) weekIdx = 3;
      weeklyBuckets[weekIdx] += Number(b.total_price || 0);
    });

    const weeklyRevenueCurrentMonth = weeklyBuckets.map((value, idx) => ({
      week: `Tuần ${idx + 1}`,
      revenue: Math.round(value),
      revenueFormatted: format(value),
    }));

    // ===== RESPONSE =====
    res.json({
      success: true,
      period,

      totals: {
        rooms: totalRooms,
        users: totalUsers,

      },

      stats: {
        revenue: Math.round(current.revenue),
        revenueFormatted: format(current.revenue),
        bookings: current.bookings,
        occupancy: Math.round(current.occupancy),
        adr: Math.round(current.adr),
        adrFormatted: format(current.adr),
        revpar: Math.round(current.revpar),
        revparFormatted: format(current.revpar),
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
      revenueOverview: {
        totalRevenue: Math.round(totalRevenueValue),
        totalRevenueFormatted: format(totalRevenueValue),
        monthlyRevenueChart,
        weeklyRevenueCurrentMonth,
      },
    });
  } catch (err) {
    console.error("Dashboard error:", err);
    res.status(500).json({ message: err.message });
  }
};