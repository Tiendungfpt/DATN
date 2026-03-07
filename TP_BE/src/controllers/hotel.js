import Hotel from "../models/Hotel";

export async function getAllHotel(req, res) {
  // Hotel.find()
  try {
    const hotels = await Hotel.find();
    return res.json(hotels);
  } catch (error) {
    return res.json({ error: error.message });
  }
}

export async function getHotelById(req, res) {
  // Hotel.findById()
  try {
    const hotel = await Hotel.findById(req.params.id);
    if (!hotel) {
      return res.status(404).json({ error: "Ko tim thay" });
    }
    return res.json(hotel);
  } catch (error) {
    return res.json({ error: error.message });
  }
}

export async function addHotel(req, res) {
  try {
    // Model.create(data) : data = req.body, Model = Hotel
    const newHotel = await Hotel.create(req.body);
    return res.status(201).json(newHotel);
  } catch (error) {
    return res.status(400).json({ message: error.message });
  }
}

export async function updateHotel(req, res) {
  // Hotel.findByIdAndUpdate()
  try {
    const hotel = await Hotel.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
    });
    if (!hotel) {
      return res.status(404).json({ error: "Ko tim thay" });
    }
    return res.json(hotel);
  } catch (error) {
    return res.json({ error: error.message });
  }
}
export async function deleteHotel(req, res) {
  // Hotel.findByIdAndDelete()
  try {
    const hotel = await Hotel.findByIdAndDelete(req.params.id);
    if (!hotel) {
      return res.status(404).json({ error: "Ko tim thay" });
    }
    return res.json({ success: true });
  } catch (error) {
    return res.json({ error: error.message });
  }
}
