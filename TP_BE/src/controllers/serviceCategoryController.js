import ServiceCategory from "../models/ServiceCategory.js";

export const listServiceCategories = async (req, res) => {
  try {
    const q = {};
    if (req.query.active !== "0") q.isActive = true;
    const items = await ServiceCategory.find(q).sort({ name: 1 }).lean();
    res.json(items);
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
};

export const createServiceCategory = async (req, res) => {
  try {
    const code = String(req.body?.code || "").trim();
    const name = String(req.body?.name || "").trim();
    if (!code) return res.status(400).json({ message: "code là bắt buộc" });
    if (!name) return res.status(400).json({ message: "name là bắt buộc" });
    const doc = await ServiceCategory.create({
      code,
      name,
      isActive: req.body?.isActive ?? true,
    });
    res.status(201).json(doc);
  } catch (e) {
    res.status(400).json({ message: e.message });
  }
};

export const updateServiceCategory = async (req, res) => {
  try {
    const patch = {};
    if (req.body?.code !== undefined) patch.code = String(req.body.code || "").trim();
    if (req.body?.name !== undefined) patch.name = String(req.body.name || "").trim();
    if (req.body?.isActive !== undefined) patch.isActive = Boolean(req.body.isActive);
    const doc = await ServiceCategory.findByIdAndUpdate(req.params.id, patch, { new: true });
    if (!doc) return res.status(404).json({ message: "Not found" });
    res.json(doc);
  } catch (e) {
    res.status(400).json({ message: e.message });
  }
};

