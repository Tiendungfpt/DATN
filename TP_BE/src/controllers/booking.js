import Booking from "../models/Booking";
import Rooms from "../models/rooms";

// CREATE BOOKING
export const createBooking = async (req, res) => {
  try {
    const { userId, roomId, checkIn, checkOut } = req.body;

    const room = await Rooms.findById(roomId);

    if (!room) {
      return res.status(404).json({
        message: "Phòng không tồn tại",
      });
    }

    const booked = await Booking.findOne({
      roomId,
      status: "confirmed",
      checkIn: { $lte: checkOut },
      checkOut: { $gte: checkIn },
    });

    if (booked) {
      return res.status(400).json({
        message: "Phòng đã được đặt trong thời gian này",
      });
    }

    const days = Math.ceil(
      (new Date(checkOut) - new Date(checkIn)) / (1000 * 60 * 60 * 24)
    );

    const totalPrice = days * room.price;

    const booking = await Booking.create({
      userId,
      roomId,
      checkIn,
      checkOut,
      totalPrice,
        status: "pending",
    });

    res.status(201).json({
      message: "Đặt phòng thành công",
      booking,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// GET ALL BOOKINGS
export const getBookings = async (req, res) => {
  try {
    const bookings = await Booking.find()
      .populate("userId", "name email")
      .populate("roomId", "name price");

    const result = bookings.map((b) => ({
      _id: b._id,
      user: b.userId,
      room: b.roomId,
      checkIn: b.checkIn,
      checkOut: b.checkOut,
      totalPrice: b.totalPrice,
      status: b.status,
      paymentStatus: b.paymentStatus,
      createdAt: b.createdAt,
      updatedAt: b.updatedAt,
    }));

    res.json(result);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// GET BOOKING BY ID
export const getBookingById = async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id)
      .populate("userId")
      .populate("roomId");

    res.json(booking);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// UPDATE BOOKING
export const updateBooking = async (req, res) => {
  try {
    const booking = await Booking.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
    });

    res.json({
      message: "Cập nhật booking thành công",
      booking,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// CANCEL BOOKING
export const cancelBooking = async (req, res) => {
  try {
    const booking = await Booking.findByIdAndUpdate(
      req.params.id,
      { status: "cancelled" },
      { new: true }
    );

    res.json({
      message: "Hủy đặt phòng thành công",
      booking,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// DELETE BOOKING
export const deleteBooking = async (req, res) => {
  try {
    await Booking.findByIdAndDelete(req.params.id);

    res.json({
      message: "Xóa booking thành công",
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// PAYMENT BOOKING
export const paymentBooking = async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id);

    if (!booking) {
      return res.status(404).json({
        message: "Không tìm thấy booking",
      });
    }

    if (booking.paymentStatus === "paid") {
      return res.status(400).json({
        message: "Booking đã thanh toán",
      });
    }

    const { paymentMethod } = req.body;

    booking.paymentMethod = paymentMethod || "cash";
    booking.paymentStatus = "paid";
    booking.transactionId = "PAY_" + Date.now();
    booking.status = "confirmed";

    await booking.save();

    res.json({
      message: "Thanh toán thành công",
      booking,
    });
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};