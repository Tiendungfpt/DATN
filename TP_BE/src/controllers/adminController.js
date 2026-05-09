import User from "../models/User.js";
import Rooms from "../models/rooms.js";
import Booking from "../models/Booking.js";
import Invoice from "../models/Invoice.js";
import { getAllBookingsAdmin } from "./booking.js";

function normalizeImageValue(imageValue) {
  const raw = String(imageValue || "").trim();
  if (!raw) return "";
  if (raw.startsWith("http://") || raw.startsWith("https://")) return raw;
  if (raw.startsWith("//")) return `https:${raw}`;
  return `https://${raw}`;
}

function parseIdList(input) {
  const arr = Array.isArray(input)
    ? input
    : String(input || "")
        .split(",")
        .map((x) => x.trim())
        .filter(Boolean);
  return arr.map((x) => String(x).trim()).filter(Boolean);
}

function getUploadedFilenames(req, fieldName) {
  if (Array.isArray(req?.files)) {
    return req.files.filter((f) => f?.fieldname === fieldName).map((f) => f.filename).filter(Boolean);
  }
  const fieldFiles = req?.files?.[fieldName];
  if (Array.isArray(fieldFiles)) return fieldFiles.map((f) => f?.filename).filter(Boolean);
  return [];
}

// ================= DASHBOARD =================

export const getDashboard = async (req, res) => {
  try {
    const totalUsers = await User.countDocuments();
    const totalRooms = await Rooms.countDocuments();
    // Đồng bộ với danh sách booking admin: chỉ tính booking đã thanh toán
    const totalBookings = await Booking.countDocuments({ status: { $ne: "cancelled" } });

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
    const rooms = await Rooms.find()
      .populate("complimentary_services", "name defaultPrice unit isActive")
      .populate("extra_services", "name defaultPrice unit isActive")
      .lean();
    res.json(rooms);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getRoomById = async (req, res) => {
  try {
    const room = await Rooms.findById(req.params.id)
      .populate("complimentary_services", "name defaultPrice unit isActive")
      .populate("extra_services", "name defaultPrice unit isActive")
      .populate({
        path: "roomType",
        select: "name code complimentary_services extra_services",
        populate: [
          { path: "complimentary_services", select: "name defaultPrice unit isActive" },
          { path: "extra_services", select: "name defaultPrice unit isActive" },
        ],
      });
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
    const singleImage = getUploadedFilenames(req, "image")[0] || "";
    const galleryImages = getUploadedFilenames(req, "images");
    const bodyImages = parseIdList(req.body.images);
    const payload = {
      ...req.body,
      image: singleImage || normalizeImageValue(req.body.image || ""),
      images: [...galleryImages, ...bodyImages].filter(Boolean),
      complimentary_services: parseIdList(req.body.complimentary_services),
      extra_services: parseIdList(req.body.extra_services),
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
    const singleImage = getUploadedFilenames(req, "image")[0] || "";
    const galleryImages = getUploadedFilenames(req, "images");
    if (singleImage) {
      payload.image = singleImage;
    } else if (Object.prototype.hasOwnProperty.call(req.body, "image")) {
      payload.image = normalizeImageValue(req.body.image || "");
    }
    if (galleryImages.length > 0 || Object.prototype.hasOwnProperty.call(req.body, "images")) {
      const bodyImages = parseIdList(req.body.images);
      payload.images = [...galleryImages, ...bodyImages].filter(Boolean);
    }
    if (Object.prototype.hasOwnProperty.call(req.body, "complimentary_services")) {
      payload.complimentary_services = parseIdList(req.body.complimentary_services);
    }
    if (Object.prototype.hasOwnProperty.call(req.body, "extra_services")) {
      payload.extra_services = parseIdList(req.body.extra_services);
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

/** Same as GET /api/bookings — sort/filter via query */
export const getBookings = getAllBookingsAdmin;

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
    const inv = await Invoice.aggregate([
      { $match: { status: "paid" } },
      { $group: { _id: null, totalRevenue: { $sum: "$grand_total" }, cnt: { $sum: 1 } } },
    ]);
    const fromInvoices = inv[0]?.totalRevenue || 0;
    const legacy = await Booking.aggregate([
      {
        $match: {
          status: { $in: ["checked_out", "completed"] },
          invoice_id: null,
        },
      },
      { $group: { _id: null, totalRevenue: { $sum: "$total_price" } } },
    ]);
    const legacySum = legacy[0]?.totalRevenue || 0;
    const totalBookings = await Booking.countDocuments({ status: { $ne: "cancelled" } });
    res.json({
      totalRevenue: fromInvoices + legacySum,
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
      { $match: { status: { $ne: "cancelled" }, room_type_id: { $ne: null } } },
      {
        $group: {
          _id: "$room_type_id",
          totalBookings: { $sum: 1 },
          revenue: { $sum: "$total_price" },
        },
      },
      { $sort: { totalBookings: -1 } },
      { $limit: 5 },
      {
        $lookup: {
          from: "roomtypes",
          localField: "_id",
          foreignField: "_id",
          as: "roomType",
        },
      },
      { $unwind: { path: "$roomType", preserveNullAndEmptyArrays: true } },
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
