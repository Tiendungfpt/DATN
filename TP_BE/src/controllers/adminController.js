import User from "../models/User.js";
import Rooms from "../models/rooms.js";
import Booking from "../models/Booking.js";
import {
  subWeeks,
  startOfISOWeek,
  endOfISOWeek,
  format,
  getISOWeek,
  getISOWeekYear,
} from "date-fns";

/** Giống GET /admin/revenue: không tính booking đã hủy */
const REVENUE_STATUS_MATCH = { status: { $ne: "cancelled" } };

function revenueDateField(basisQuery) {
  return basisQuery === "checkoutDate" ? "check_out_date" : "createdAt";
}

function normalizeImageValue(imageValue) {
  const raw = String(imageValue || "").trim();
  if (!raw) return "";
  if (raw.startsWith("http://") || raw.startsWith("https://")) return raw;
  if (raw.startsWith("//")) return `https:${raw}`;
  return `https://${raw}`;
}

// ================= DASHBOARD =================

export const getDashboard = async (req, res) => {
  try {
    const totalUsers = await User.countDocuments();
    const totalRooms = await Rooms.countDocuments();
    const totalBookings = await Booking.countDocuments();

    res.json({
      totalUsers,
      totalRooms,
      totalBookings,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ================= USERS =================

export const getUsers = async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const skip = (page - 1) * limit;

  const users = await User.find()
    .skip(skip)
    .limit(limit)
    .select("-password");

  const totalUsers = await User.countDocuments();

  res.json({
    page,
    totalUsers,
    totalPages: Math.ceil(totalUsers / limit),
    users,
  });
};

export const getUserById = async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select("-password");
    if (!user) {
      return res.status(404).json({ message: "User không tồn tại" });
    }
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const updateUserRole = async (req, res) => {
  try {
    const { role } = req.body;
    if (!["user", "admin"].includes(role)) {
      return res.status(400).json({ message: "Role không hợp lệ" });
    }
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { role },
      { new: true }
    ).select("-password");

    if (!user) {
      return res.status(404).json({ message: "User không tồn tại" });
    }
    res.json({ message: "Cập nhật role thành công", user });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const deleteUser = async (req, res) => {
  try {
    await User.findByIdAndDelete(req.params.id);
    res.json({ message: "Xóa user thành công" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ================= ROOMS =================

export const getRooms = async (req, res) => {
  try {
    const rooms = await Rooms.find().lean();
    res.json(rooms);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getRoomById = async (req, res) => {
  try {
    const room = await Rooms.findById(req.params.id);
    if (!room) {
      return res.status(404).json({ message: "Không tìm thấy phòng" });
    }
    res.json(room);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const createRoom = async (req, res) => {
  try {
    const payload = {
      ...req.body,
      image: req.file
        ? req.file.filename
        : normalizeImageValue(req.body.image || ""),
    };
    const room = await Rooms.create(payload);
    res.status(201).json(room);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

export const updateRoom = async (req, res) => {
  try {
    const payload = { ...req.body };
    if (req.file) {
      payload.image = req.file.filename;
    } else if (Object.prototype.hasOwnProperty.call(req.body, "image")) {
      payload.image = normalizeImageValue(req.body.image || "");
    }
    const room = await Rooms.findByIdAndUpdate(req.params.id, payload, {
      new: true,
    });
    if (!room) {
      return res.status(404).json({ message: "Không tìm thấy phòng" });
    }
    res.json(room);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

export const deleteRoom = async (req, res) => {
  try {
    await Rooms.findByIdAndDelete(req.params.id);
    res.json({ message: "Xóa phòng thành công" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ================= BOOKINGS =================

export const getBookings = async (req, res) => {
  try {
    const bookings = await Booking.find()
      .populate("user_id", "name email")
      .populate("room_id", "name image price capacity room_no")
      .populate("assigned_room_id", "name image price capacity room_no")
      .sort({ createdAt: -1 })
      .lean();
    res.json(bookings);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const deleteBooking = async (req, res) => {
  try {
    await Booking.findByIdAndDelete(req.params.id);
    res.json({ message: "Xóa booking thành công" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ================= REVENUE =================

export const getRevenue = async (req, res) => {
  try {
    const revenue = await Booking.aggregate([
      { $match: REVENUE_STATUS_MATCH },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: "$total_price" },
          totalBookings: { $sum: 1 },
        },
      },
    ]);

    res.json(
      revenue[0] || {
        totalRevenue: 0,
        totalBookings: 0,
      }
    );
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * GET /api/admin/revenue/by-month?year=2026&basis=bookingDate|checkoutDate
 * Doanh thu theo từng tháng trong năm (đủ 12 tháng, tháng không có dữ liệu = 0).
 * basis: bookingDate = theo ngày tạo booking (mặc định), checkoutDate = theo ngày trả phòng.
 */
export const getRevenueByMonth = async (req, res) => {
  try {
    const parsedYear = parseInt(req.query.year, 10);
    const year = Number.isFinite(parsedYear) ? parsedYear : new Date().getFullYear();
    const field = revenueDateField(req.query.basis);

    const yearStart = new Date(year, 0, 1);
    const yearEnd = new Date(year + 1, 0, 1);

    const agg = await Booking.aggregate([
      {
        $match: {
          ...REVENUE_STATUS_MATCH,
          [field]: { $gte: yearStart, $lt: yearEnd },
        },
      },
      {
        $group: {
          _id: { $month: `$${field}` },
          revenue: { $sum: "$total_price" },
          bookingCount: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    const byMonth = new Map(agg.map((row) => [row._id, row]));
    const buckets = [];
    for (let m = 1; m <= 12; m++) {
      const row = byMonth.get(m);
      buckets.push({
        month: m,
        label: `Tháng ${m}/${year}`,
        revenue: row?.revenue ?? 0,
        bookingCount: row?.bookingCount ?? 0,
      });
    }

    const totalYearRevenue = buckets.reduce((s, b) => s + b.revenue, 0);
    const totalYearBookings = buckets.reduce((s, b) => s + b.bookingCount, 0);

    res.json({
      year,
      basis: field === "check_out_date" ? "checkoutDate" : "bookingDate",
      currency: "VND",
      buckets,
      totalYearRevenue,
      totalYearBookings,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * GET /api/admin/revenue/by-week?weeks=12&basis=bookingDate|checkoutDate
 * Doanh thu theo tuần ISO (Thứ 2 → Chủ nhật), mặc định 12 tuần gần nhất.
 */
export const getRevenueByWeek = async (req, res) => {
  try {
    const weeks = Math.min(Math.max(parseInt(req.query.weeks, 10) || 12, 1), 52);
    const field = revenueDateField(req.query.basis);

    const now = new Date();
    const rangeStart = subWeeks(startOfISOWeek(now, { weekStartsOn: 1 }), weeks + 1);

    const agg = await Booking.aggregate([
      {
        $match: {
          ...REVENUE_STATUS_MATCH,
          [field]: { $gte: rangeStart },
        },
      },
      {
        $group: {
          _id: {
            y: { $isoWeekYear: `$${field}` },
            w: { $isoWeek: `$${field}` },
          },
          revenue: { $sum: "$total_price" },
          bookingCount: { $sum: 1 },
        },
      },
    ]);

    const keyOf = (y, w) => `${y}-W${String(w).padStart(2, "0")}`;
    const fromAgg = new Map(
      agg.map((row) => [
        keyOf(row._id.y, row._id.w),
        { revenue: row.revenue, bookingCount: row.bookingCount },
      ]),
    );

    const buckets = [];
    for (let i = weeks - 1; i >= 0; i--) {
      const d = subWeeks(now, i);
      const start = startOfISOWeek(d, { weekStartsOn: 1 });
      const end = endOfISOWeek(d, { weekStartsOn: 1 });
      const y = getISOWeekYear(start);
      const w = getISOWeek(start, { weekStartsOn: 1 });
      const k = keyOf(y, w);
      const row = fromAgg.get(k);
      buckets.push({
        isoYear: y,
        isoWeek: w,
        weekStart: format(start, "yyyy-MM-dd"),
        weekEnd: format(end, "yyyy-MM-dd"),
        label: `${format(start, "dd/MM")} – ${format(end, "dd/MM/yyyy")}`,
        revenue: row?.revenue ?? 0,
        bookingCount: row?.bookingCount ?? 0,
      });
    }

    const totalRevenue = buckets.reduce((s, b) => s + b.revenue, 0);
    const totalBookings = buckets.reduce((s, b) => s + b.bookingCount, 0);

    res.json({
      weeks,
      basis: field === "check_out_date" ? "checkoutDate" : "bookingDate",
      currency: "VND",
      buckets,
      totalRevenue,
      totalBookings,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ================= TOP ROOMS =================

export const getTopRooms = async (req, res) => {
  try {
    const topRooms = await Booking.aggregate([
      { $match: REVENUE_STATUS_MATCH },
      {
        $group: {
          _id: "$room_id",
          totalBookings: { $sum: 1 },
          revenue: { $sum: "$total_price" },
        },
      },
      { $sort: { totalBookings: -1 } },
      { $limit: 5 },
      {
        $lookup: {
          from: "rooms",
          localField: "_id",
          foreignField: "_id",
          as: "room",
        },
      },
      { $unwind: "$room" },
    ]);

    res.json(topRooms);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ================= BOOKING STATS =================

export const getBookingStats = async (req, res) => {
  try {
    const stats = await Booking.aggregate([
      {
        $group: {
          _id: { $month: "$createdAt" },
          totalBookings: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);
    res.json(stats);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ================= SEARCH USER =================

export const searchUsers = async (req, res) => {
  try {
    const { search } = req.query;
    const users = await User.find({
      email: { $regex: search, $options: "i" },
    }).select("-password");
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ================= PAGINATION USER =================

export const getUsersPagination = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 5;
    const skip = (page - 1) * limit;

    const users = await User.find()
      .skip(skip)
      .limit(limit)
      .select("-password");

    const totalUsers = await User.countDocuments();

    res.json({
      page,
      totalUsers,
      totalPages: Math.ceil(totalUsers / limit),
      users,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
