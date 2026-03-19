import User from "../models/User.js";
import Hotel from "../models/Hotel.js";
import Rooms from "../models/rooms.js";
import Booking from "../models/Booking.js";


// ================= DASHBOARD =================

export const getDashboard = async (req, res) => {
  try {

    const totalUsers = await User.countDocuments();
    const totalHotels = await Hotel.countDocuments();
    const totalRooms = await Rooms.countDocuments();
    const totalBookings = await Booking.countDocuments();

    res.json({
      totalUsers,
      totalHotels,
      totalRooms,
      totalBookings
    });

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};


// ================= USERS =================

// GET ALL USERS
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
    users
  });
};


// GET USER BY ID
export const getUserById = async (req, res) => {
  try {

    const user = await User.findById(req.params.id).select("-password");

    if (!user) {
      return res.status(404).json({
        message: "User không tồn tại"
      });
    }

    res.json(user);

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// UPDATE ROLE USER
export const updateUserRole = async (req, res) => {
  try {
    const { role } = req.body;

    if (!["user", "admin"].includes(role)) {
      return res.status(400).json({
        message: "Role không hợp lệ",
      });
    }

    const user = await User.findByIdAndUpdate(
      req.params.id,
      { role },
      { new: true }
    ).select("-password");

    if (!user) {
      return res.status(404).json({
        message: "User không tồn tại",
      });
    }

    res.json({
      message: "Cập nhật role thành công",
      user,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
// DELETE USER
export const deleteUser = async (req, res) => {
  try {

    await User.findByIdAndDelete(req.params.id);

    res.json({
      message: "Xóa user thành công"
    });

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};



// ================= HOTELS =================

// GET ALL HOTELS
export const getHotels = async (req, res) => {
  try {

    const hotels = await Hotel.find();

    res.json(hotels);

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};


// DELETE HOTEL
export const deleteHotel = async (req, res) => {
  try {

    await Hotel.findByIdAndDelete(req.params.id);

    res.json({
      message: "Xóa hotel thành công"
    });

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};



// ================= ROOMS =================

// GET ALL ROOMS
export const getRooms = async (req, res) => {
  try {

    const rooms = await Rooms.find().populate("hotelId", "name");

    res.json(rooms);

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};


// DELETE ROOM
export const deleteRoom = async (req, res) => {
  try {

    await Rooms.findByIdAndDelete(req.params.id);

    res.json({
      message: "Xóa phòng thành công"
    });

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};



// ================= BOOKINGS =================

// GET BOOKINGS
export const getBookings = async (req, res) => {
  try {

    const bookings = await Booking.find()
      .populate("userId", "email")
      .populate("roomId", "name price");

    res.json(bookings);

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};


// DELETE BOOKING
export const deleteBooking = async (req, res) => {
  try {

    await Booking.findByIdAndDelete(req.params.id);

    res.json({
      message: "Xóa booking thành công"
    });

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
// ================= REVENUE =================

export const getRevenue = async (req, res) => {
  try {

    const revenue = await Booking.aggregate([
      {
        $lookup: {
          from: "rooms",
          localField: "roomId",
          foreignField: "_id",
          as: "room"
        }
      },
      {
        $unwind: "$room"
      },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: "$room.price" },
          totalBookings: { $sum: 1 }
        }
      }
    ]);

    res.json(revenue[0] || {
      totalRevenue: 0,
      totalBookings: 0
    });

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
// ================= TOP ROOMS =================

export const getTopRooms = async (req, res) => {
  try {

    const topRooms = await Booking.aggregate([
      {
        $group: {
          _id: "$roomId",
          totalBookings: { $sum: 1 }
        }
      },
      {
        $sort: { totalBookings: -1 }
      },
      {
        $limit: 5
      },
      {
        $lookup: {
          from: "rooms",
          localField: "_id",
          foreignField: "_id",
          as: "room"
        }
      },
      {
        $unwind: "$room"
      }
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
          totalBookings: { $sum: 1 }
        }
      },
      {
        $sort: { "_id": 1 }
      }
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
      email: { $regex: search, $options: "i" }
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
      users
    });

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};