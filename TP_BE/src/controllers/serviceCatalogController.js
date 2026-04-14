import Service from "../models/Service.js";

export const listServices = async (req, res) => {
  try {
    const q = {};
    if (req.query.active !== "0") q.isActive = true;
    const items = await Service.find(q).sort({ name: 1 }).lean();
    res.json(items);
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
};

export const createService = async (req, res) => {
  try {
    const doc = await Service.create(req.body);
    res.status(201).json(doc);
  } catch (e) {
    res.status(400).json({ message: e.message });
  }
};

export const updateService = async (req, res) => {
  try {
    const doc = await Service.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!doc) return res.status(404).json({ message: "Not found" });
    res.json(doc);
  } catch (e) {
    res.status(400).json({ message: e.message });
  }
};
