import DiscountCode from "../models/DiscountCode.js";

function computeDiscountAmount(doc, orderTotal) {
  const total = Math.max(0, Number(orderTotal) || 0);
  if (!doc) return 0;
  const type = String(doc.discount_type || "percent");
  const value = Math.max(0, Number(doc.discount_value) || 0);
  if (total <= 0 || value <= 0) return 0;

  let amount = 0;
  if (type === "percent") {
    amount = (total * value) / 100;
    const maxCap = Math.max(0, Number(doc.max_discount_amount) || 0);
    if (maxCap > 0) amount = Math.min(amount, maxCap);
  } else {
    amount = value;
  }

  return Math.min(total, Math.max(0, Math.round(amount)));
}

export async function evaluateDiscountCode(codeRaw, orderTotal) {
  const code = String(codeRaw || "").trim().toUpperCase();
  const total = Math.max(0, Number(orderTotal) || 0);
  if (!code) return { ok: false, message: "Vui lòng nhập mã giảm giá." };
  if (total <= 0) return { ok: false, message: "Tổng đơn hàng không hợp lệ." };

  const doc = await DiscountCode.findOne({ code }).lean();
  if (!doc) return { ok: false, message: "Mã giảm giá không tồn tại." };
  if (!doc.is_active) return { ok: false, message: "Mã giảm giá đã bị vô hiệu hóa." };

  const now = new Date();
  if (doc.start_at && now < new Date(doc.start_at)) {
    return { ok: false, message: "Mã giảm giá chưa đến thời gian áp dụng." };
  }
  if (doc.end_at && now > new Date(doc.end_at)) {
    return { ok: false, message: "Mã giảm giá đã hết hạn." };
  }
  const usageLimit = Math.max(0, Number(doc.usage_limit) || 0);
  const usedCount = Math.max(0, Number(doc.used_count) || 0);
  if (usageLimit > 0 && usedCount >= usageLimit) {
    return { ok: false, message: "Mã giảm giá đã hết lượt sử dụng." };
  }
  const minOrder = Math.max(0, Number(doc.min_order_value) || 0);
  if (total < minOrder) {
    return {
      ok: false,
      message: `Đơn tối thiểu ${minOrder.toLocaleString("vi-VN")}đ mới áp dụng mã này.`,
    };
  }

  const discountAmount = computeDiscountAmount(doc, total);
  if (discountAmount <= 0) return { ok: false, message: "Mã không áp dụng cho đơn hàng này." };

  return {
    ok: true,
    code: doc.code,
    discount_code_id: String(doc._id),
    discount_amount: discountAmount,
    final_total: Math.max(0, total - discountAmount),
    doc,
  };
}

export const validateDiscountCode = async (req, res) => {
  try {
    const code = req.query.code ?? req.body?.code;
    const orderTotal = req.query.order_total ?? req.body?.order_total;
    const result = await evaluateDiscountCode(code, orderTotal);
    if (!result.ok) return res.status(400).json(result);
    return res.json({
      ok: true,
      code: result.code,
      discount_code_id: result.discount_code_id,
      discount_amount: result.discount_amount,
      final_total: result.final_total,
    });
  } catch (e) {
    return res.status(500).json({ ok: false, message: e.message });
  }
};

export const listPublicDiscountCodes = async (_req, res) => {
  try {
    const now = new Date();
    const docs = await DiscountCode.find({
      is_active: true,
      $and: [
        { $or: [{ start_at: null }, { start_at: { $lte: now } }] },
        { $or: [{ end_at: null }, { end_at: { $gte: now } }] },
      ],
    })
      .sort({ createdAt: -1 })
      .lean();

    const items = docs
      .filter((d) => {
        const usageLimit = Math.max(0, Number(d.usage_limit) || 0);
        const usedCount = Math.max(0, Number(d.used_count) || 0);
        return usageLimit === 0 || usedCount < usageLimit;
      })
      .map((d) => ({
        _id: d._id,
        code: d.code,
        name: d.name || "",
        discount_type: d.discount_type,
        discount_value: Number(d.discount_value || 0),
        min_order_value: Number(d.min_order_value || 0),
        max_discount_amount: Number(d.max_discount_amount || 0),
      }));

    return res.json(items);
  } catch (e) {
    return res.status(500).json({ message: e.message });
  }
};

export const listDiscountCodes = async (_req, res) => {
  try {
    const items = await DiscountCode.find().sort({ createdAt: -1 }).lean();
    return res.json(items);
  } catch (e) {
    return res.status(500).json({ message: e.message });
  }
};

export const createDiscountCode = async (req, res) => {
  try {
    const payload = {
      code: String(req.body?.code || "").trim().toUpperCase(),
      name: String(req.body?.name || "").trim(),
      discount_type: String(req.body?.discount_type || "percent"),
      discount_value: Math.max(0, Number(req.body?.discount_value) || 0),
      min_order_value: Math.max(0, Number(req.body?.min_order_value) || 0),
      max_discount_amount: Math.max(0, Number(req.body?.max_discount_amount) || 0),
      usage_limit: Math.max(0, Number(req.body?.usage_limit) || 0),
      start_at: req.body?.start_at ? new Date(req.body.start_at) : null,
      end_at: req.body?.end_at ? new Date(req.body.end_at) : null,
      is_active: req.body?.is_active !== undefined ? Boolean(req.body.is_active) : true,
    };
    if (!payload.code) return res.status(400).json({ message: "Thiếu code." });
    if (!["percent", "fixed"].includes(payload.discount_type)) {
      return res.status(400).json({ message: "discount_type phải là percent hoặc fixed." });
    }
    if (payload.discount_type === "percent" && payload.discount_value > 100) {
      return res.status(400).json({ message: "discount_value (%) không được vượt quá 100." });
    }
    const doc = await DiscountCode.create(payload);
    return res.status(201).json(doc);
  } catch (e) {
    return res.status(400).json({ message: e.message });
  }
};

export const updateDiscountCode = async (req, res) => {
  try {
    const payload = {};
    if (req.body?.code !== undefined) payload.code = String(req.body.code || "").trim().toUpperCase();
    if (req.body?.name !== undefined) payload.name = String(req.body.name || "").trim();
    if (req.body?.discount_type !== undefined) payload.discount_type = String(req.body.discount_type || "");
    if (req.body?.discount_value !== undefined) payload.discount_value = Math.max(0, Number(req.body.discount_value) || 0);
    if (req.body?.min_order_value !== undefined) payload.min_order_value = Math.max(0, Number(req.body.min_order_value) || 0);
    if (req.body?.max_discount_amount !== undefined) payload.max_discount_amount = Math.max(0, Number(req.body.max_discount_amount) || 0);
    if (req.body?.usage_limit !== undefined) payload.usage_limit = Math.max(0, Number(req.body.usage_limit) || 0);
    if (req.body?.start_at !== undefined) payload.start_at = req.body.start_at ? new Date(req.body.start_at) : null;
    if (req.body?.end_at !== undefined) payload.end_at = req.body.end_at ? new Date(req.body.end_at) : null;
    if (req.body?.is_active !== undefined) payload.is_active = Boolean(req.body.is_active);

    const doc = await DiscountCode.findByIdAndUpdate(req.params.id, payload, { new: true, runValidators: true });
    if (!doc) return res.status(404).json({ message: "Không tìm thấy mã giảm giá." });
    return res.json(doc);
  } catch (e) {
    return res.status(400).json({ message: e.message });
  }
};

export const deleteDiscountCode = async (req, res) => {
  try {
    const doc = await DiscountCode.findByIdAndDelete(req.params.id);
    if (!doc) return res.status(404).json({ message: "Không tìm thấy mã giảm giá." });
    return res.json({ ok: true });
  } catch (e) {
    return res.status(500).json({ message: e.message });
  }
};
