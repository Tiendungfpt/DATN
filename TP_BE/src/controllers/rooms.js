import Rooms from "../models/rooms.js";

// lấy tất cả phòng
export async function getAllRooms(req, res) {
  try {
    const rooms = await Rooms.find().populate(
      "hotelId",
      "name rating locationNote"
    );
    return res.status(200).json(rooms);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}

// tìm kiếm phòng
export async function searchRooms(req, res) {
  try {

    const { hotelId, minPrice, maxPrice, capacity, sort } = req.query;

    let query = {};

    // lọc theo khách sạn
    if (hotelId) {
      query.hotelId = hotelId;
    }

    // lọc theo giá
    if (minPrice || maxPrice) {
      query.price = {};

      if (minPrice) {
        query.price.$gte = Number(minPrice);
      }

      if (maxPrice) {
        query.price.$lte = Number(maxPrice);
      }
    }

    // lọc theo số người
    if (capacity) {
      query.capacity = capacity;
    }

    // sắp xếp giá
    let sortOption = {};
    if (sort === "asc") {
      sortOption.price = 1;
    }
    if (sort === "desc") {
      sortOption.price = -1;
    }

    const rooms = await Rooms.find(query)
      .populate("hotelId", "name rating locationNote")
      .sort(sortOption);

    return res.status(200).json({
      message: "Search rooms successfully",
      total: rooms.length,
      data: rooms,
    });

  } catch (error) {
    return res.status(500).json({
      message: error.message,
    });
  }
}

// lấy phòng theo hotel
export async function getRoomsByHotel(req, res) {
  try {

    const hotelId = req.params.hotelId;

    const rooms = await Rooms.find({
      hotelId: hotelId
    }).populate("hotelId", "name rating locationNote");

    if (rooms.length === 0) {
      return res.status(404).json({
        message: "Không có phòng thuộc khách sạn này"
      });
    }

    return res.json(rooms);

  } catch (error) {
    return res.status(500).json({
      message: error.message
    });
  }
}

// lấy phòng theo id
export async function getRoomsById(req, res) {
  try {
    const room = await Rooms.findById(req.params.id).populate("hotelId");

    if (!room) {
      return res.status(404).json({ error: "Không tìm thấy phòng" });
    }

    return res.status(200).json(room);

  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}

// thêm phòng
export async function addRooms(req, res) {
  try {
    const newRoom = await Rooms.create({
      ...req.body,
      image: req.file ? req.file.filename : "" // 🔥 thêm dòng này
    });

    return res.status(201).json(newRoom);

  } catch (error) {
    return res.status(400).json({ message: error.message });
  }
}

// cập nhật phòng
export async function updateRooms(req, res) {
  try {
    const updateData = {
      ...req.body
    };

    // 🔥 nếu có upload ảnh mới thì update ảnh
    if (req.file) {
      updateData.image = req.file.filename;
    }

    const room = await Rooms.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true }
    );

    if (!room) {
      return res.status(404).json({ error: "Không tìm thấy phòng" });
    }

    return res.status(200).json(room);

  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}

// xóa phòng
export async function deleteRooms(req, res) {
  try {
    const room = await Rooms.findByIdAndDelete(req.params.id);

    if (!room) {
      return res.status(404).json({ error: "Không tìm thấy phòng" });
    }

    return res.status(200).json({
      message: "Xóa phòng thành công",
    });

  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}