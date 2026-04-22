import Service from "../models/Service.js";

export const listServices = async (req, res) => {
  try {
    const q = {};
    if (req.query.active !== "0") q.isActive = true;
    const items = await Service.find(q).populate("category_id", "code name isActive").sort({ name: 1 }).lean();
    res.json(items);
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
};

export const createService = async (req, res) => {
  try {
    const body = req.body || {};
    const doc = await Service.create({
      name: body.name,
      defaultPrice: body.defaultPrice,
      category_id: body.category_id || null,
      unit: body.unit || "",
      description: body.description || "",
      isActive: body.isActive ?? true,
    });
    res.status(201).json(doc);
  } catch (e) {
    res.status(400).json({ message: e.message });
  }
};

export const updateService = async (req, res) => {
  try {
    const body = req.body || {};
    const patch = {};
    if (body.name !== undefined) patch.name = body.name;
    if (body.defaultPrice !== undefined) patch.defaultPrice = body.defaultPrice;
    if (body.category_id !== undefined) patch.category_id = body.category_id || null;
    if (body.unit !== undefined) patch.unit = body.unit || "";
    if (body.description !== undefined) patch.description = body.description || "";
    if (body.isActive !== undefined) patch.isActive = Boolean(body.isActive);

    const doc = await Service.findByIdAndUpdate(req.params.id, patch, { new: true }).populate(
      "category_id",
      "code name isActive",
    );
    if (!doc) return res.status(404).json({ message: "Not found" });
    res.json(doc);
  } catch (e) {
    res.status(400).json({ message: e.message });
  }
};
