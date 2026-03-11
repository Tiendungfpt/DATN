import Rooms from "../models/rooms";

export async function getAllRooms(req, res) {
  // Rooms.find()
  try {
    const roomss = await Rooms.find();
    return res.json(roomss);
  } catch (error) {
    return res.json({ error: error.message });
  }
}

export async function getRoomsById(req, res) {
  // Rooms.findById()
  try {
    const rooms = await Rooms.findById(req.params.id);
    if (!rooms) {
      return res.status(404).json({ error: "Ko tim thay" });
    }
    return res.json(rooms);
  } catch (error) {
    return res.json({ error: error.message });
  }
}

export async function addRooms(req, res) {
  try {
    // Model.create(data) : data = req.body, Model = Rooms
    const newRooms = await Rooms.create(req.body);
    return res.status(201).json(newRooms);
  } catch (error) {
    return res.status(400).json({ message: error.message });
  }
}

export async function updateRooms(req, res) {
  // Rooms.findByIdAndUpdate()
  try {
    const rooms = await Rooms.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
    });
    if (!rooms) {
      return res.status(404).json({ error: "Ko tim thay" });
    }
    return res.json(rooms);
  } catch (error) {
    return res.json({ error: error.message });
  }
}
export async function deleteRooms(req, res) {
  // Rooms.findByIdAndDelete()
  try {
    const rooms = await Rooms.findByIdAndDelete(req.params.id);
    if (!rooms) {
      return res.status(404).json({ error: "Ko tim thay" });
    }
    return res.json({ success: true });
  } catch (error) {
    return res.json({ error: error.message });
  }
}
