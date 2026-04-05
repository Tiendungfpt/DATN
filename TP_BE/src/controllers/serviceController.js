import Service from "../models/Service.js";

export const getAllServices = async (req, res) => {
  try {
    const services = await Service.find().sort({ createdAt: -1 });
    res.json(services);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getServiceById = async (req, res) => {
  try {
    const service = await Service.findById(req.params.id);
    if (!service) {
      return res.status(404).json({ message: "Dịch vụ không tồn tại" });
    }
    res.json(service);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const createService = async (req, res) => {
  try {
    const { name, description, price, icon, active } = req.body;

    if (!name || price === undefined) {
      return res.status(400).json({ message: "Tên và giá dịch vụ là bắt buộc" });
    }

    const newService = await Service.create({
      name: name.trim(),
      description: description || "",
      price: Number(price),
      icon: icon || "star",
      active: active !== false,
    });

    res.status(201).json(newService);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

export const updateService = async (req, res) => {
  try {
    const { name, description, price, icon, active } = req.body;
    const updateData = {};

    if (name) updateData.name = name.trim();
    if (description !== undefined) updateData.description = description;
    if (price !== undefined) updateData.price = Number(price);
    if (icon) updateData.icon = icon;
    if (active !== undefined) updateData.active = active;

    const service = await Service.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true }
    );

    if (!service) {
      return res.status(404).json({ message: "Dịch vụ không tồn tại" });
    }

    res.json({ message: "Cập nhật dịch vụ thành công", service });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

export const deleteService = async (req, res) => {
  try {
    const service = await Service.findByIdAndDelete(req.params.id);

    if (!service) {
      return res.status(404).json({ message: "Dịch vụ không tồn tại" });
    }

    res.json({ message: "Xóa dịch vụ thành công" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
