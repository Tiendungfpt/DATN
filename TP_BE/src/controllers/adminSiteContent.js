import Amenity from "../models/Amenity.js";
import GalleryImage from "../models/GalleryImage.js";
import ExternalRating from "../models/ExternalRating.js";
import LocationPlace from "../models/LocationPlace.js";
import FaqItem from "../models/FaqItem.js";
import NewsletterSubscriber from "../models/NewsletterSubscriber.js";

function pick(body, allowed) {
  const out = {};
  for (const k of allowed) {
    if (body?.[k] === undefined) continue;
    out[k] = body[k];
  }
  return out;
}

function toBool(v, def) {
  if (v === undefined || v === null) return def;
  if (typeof v === "boolean") return v;
  const s = String(v).trim().toLowerCase();
  if (s === "true" || s === "1") return true;
  if (s === "false" || s === "0") return false;
  return def;
}

function toNum(v, def) {
  const n = Number(v);
  return Number.isFinite(n) ? n : def;
}

export async function adminListAmenities(req, res) {
  try {
    const includeInactive = toBool(req.query.include_inactive, true);
    const filter = includeInactive ? {} : { is_active: true };
    const items = await Amenity.find(filter).sort({ order: 1, _id: 1 }).lean();
    res.json({ items });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
}

export async function adminCreateAmenity(req, res) {
  try {
    const data = pick(req.body, ["key", "icon", "title", "description", "order", "is_active"]);
    if (!String(data.title || "").trim()) return res.status(400).json({ message: "Thiếu title" });
    const doc = await Amenity.create({
      key: String(data.key || "").trim(),
      icon: String(data.icon || "").trim(),
      title: String(data.title || "").trim(),
      description: String(data.description || "").trim(),
      order: toNum(data.order, 0),
      is_active: toBool(data.is_active, true),
    });
    res.status(201).json(doc);
  } catch (e) {
    res.status(400).json({ message: e.message });
  }
}

export async function adminUpdateAmenity(req, res) {
  try {
    const data = pick(req.body, ["key", "icon", "title", "description", "order", "is_active"]);
    const patch = {};
    if (data.key !== undefined) patch.key = String(data.key || "").trim();
    if (data.icon !== undefined) patch.icon = String(data.icon || "").trim();
    if (data.title !== undefined) patch.title = String(data.title || "").trim();
    if (data.description !== undefined) patch.description = String(data.description || "").trim();
    if (data.order !== undefined) patch.order = toNum(data.order, 0);
    if (data.is_active !== undefined) patch.is_active = toBool(data.is_active, true);
    const doc = await Amenity.findByIdAndUpdate(req.params.id, patch, { new: true, runValidators: true });
    if (!doc) return res.status(404).json({ message: "Not found" });
    res.json(doc);
  } catch (e) {
    res.status(400).json({ message: e.message });
  }
}

export async function adminDeleteAmenity(req, res) {
  try {
    const doc = await Amenity.findByIdAndDelete(req.params.id);
    if (!doc) return res.status(404).json({ message: "Not found" });
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
}

export async function adminListGallery(req, res) {
  try {
    const includeInactive = toBool(req.query.include_inactive, true);
    const filter = includeInactive ? {} : { is_active: true };
    const items = await GalleryImage.find(filter).sort({ order: 1, _id: 1 }).lean();
    res.json({ items });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
}

export async function adminCreateGallery(req, res) {
  try {
    const data = pick(req.body, ["url", "title", "alt", "order", "is_active", "source"]);
    if (!String(data.url || "").trim()) return res.status(400).json({ message: "Thiếu url" });
    const doc = await GalleryImage.create({
      url: String(data.url || "").trim(),
      title: String(data.title || "").trim(),
      alt: String(data.alt || "").trim(),
      order: toNum(data.order, 0),
      is_active: toBool(data.is_active, true),
      source: String(data.source || "manual").trim(),
    });
    res.status(201).json(doc);
  } catch (e) {
    res.status(400).json({ message: e.message });
  }
}

export async function adminUpdateGallery(req, res) {
  try {
    const data = pick(req.body, ["url", "title", "alt", "order", "is_active", "source"]);
    const patch = {};
    if (data.url !== undefined) patch.url = String(data.url || "").trim();
    if (data.title !== undefined) patch.title = String(data.title || "").trim();
    if (data.alt !== undefined) patch.alt = String(data.alt || "").trim();
    if (data.order !== undefined) patch.order = toNum(data.order, 0);
    if (data.is_active !== undefined) patch.is_active = toBool(data.is_active, true);
    if (data.source !== undefined) patch.source = String(data.source || "manual").trim();
    const doc = await GalleryImage.findByIdAndUpdate(req.params.id, patch, { new: true, runValidators: true });
    if (!doc) return res.status(404).json({ message: "Not found" });
    res.json(doc);
  } catch (e) {
    res.status(400).json({ message: e.message });
  }
}

export async function adminDeleteGallery(req, res) {
  try {
    const doc = await GalleryImage.findByIdAndDelete(req.params.id);
    if (!doc) return res.status(404).json({ message: "Not found" });
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
}

export async function adminListRatings(req, res) {
  try {
    const includeInactive = toBool(req.query.include_inactive, true);
    const filter = includeInactive ? {} : { is_active: true };
    const items = await ExternalRating.find(filter).sort({ order: 1, _id: 1 }).lean();
    res.json({ items });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
}

export async function adminUpsertRating(req, res) {
  try {
    const data = pick(req.body, ["platform", "score", "total", "order", "is_active"]);
    const platform = String(data.platform || "").trim();
    if (!platform) return res.status(400).json({ message: "Thiếu platform" });
    const doc = await ExternalRating.findOneAndUpdate(
      { platform },
      {
        platform,
        score: toNum(data.score, 0),
        total: Math.max(0, Number.parseInt(String(data.total ?? 0), 10) || 0),
        order: toNum(data.order, 0),
        is_active: toBool(data.is_active, true),
      },
      { upsert: true, new: true, runValidators: true },
    );
    res.json(doc);
  } catch (e) {
    res.status(400).json({ message: e.message });
  }
}

export async function adminDeleteRating(req, res) {
  try {
    const doc = await ExternalRating.findByIdAndDelete(req.params.id);
    if (!doc) return res.status(404).json({ message: "Not found" });
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
}

export async function adminListLocationPlaces(req, res) {
  try {
    const includeInactive = toBool(req.query.include_inactive, true);
    const filter = includeInactive ? {} : { is_active: true };
    const items = await LocationPlace.find(filter).sort({ order: 1, _id: 1 }).lean();
    res.json({ items });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
}

export async function adminCreateLocationPlace(req, res) {
  try {
    const data = pick(req.body, ["name", "distance_km", "eta_text", "order", "is_active"]);
    if (!String(data.name || "").trim()) return res.status(400).json({ message: "Thiếu name" });
    const doc = await LocationPlace.create({
      name: String(data.name || "").trim(),
      distance_km: String(data.distance_km || "").trim(),
      eta_text: String(data.eta_text || "").trim(),
      order: toNum(data.order, 0),
      is_active: toBool(data.is_active, true),
    });
    res.status(201).json(doc);
  } catch (e) {
    res.status(400).json({ message: e.message });
  }
}

export async function adminUpdateLocationPlace(req, res) {
  try {
    const data = pick(req.body, ["name", "distance_km", "eta_text", "order", "is_active"]);
    const patch = {};
    if (data.name !== undefined) patch.name = String(data.name || "").trim();
    if (data.distance_km !== undefined) patch.distance_km = String(data.distance_km || "").trim();
    if (data.eta_text !== undefined) patch.eta_text = String(data.eta_text || "").trim();
    if (data.order !== undefined) patch.order = toNum(data.order, 0);
    if (data.is_active !== undefined) patch.is_active = toBool(data.is_active, true);
    const doc = await LocationPlace.findByIdAndUpdate(req.params.id, patch, { new: true, runValidators: true });
    if (!doc) return res.status(404).json({ message: "Not found" });
    res.json(doc);
  } catch (e) {
    res.status(400).json({ message: e.message });
  }
}

export async function adminDeleteLocationPlace(req, res) {
  try {
    const doc = await LocationPlace.findByIdAndDelete(req.params.id);
    if (!doc) return res.status(404).json({ message: "Not found" });
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
}

export async function adminListFaqs(req, res) {
  try {
    const includeInactive = toBool(req.query.include_inactive, true);
    const filter = includeInactive ? {} : { is_active: true };
    const items = await FaqItem.find(filter).sort({ order: 1, _id: 1 }).lean();
    res.json({ items });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
}

export async function adminCreateFaq(req, res) {
  try {
    const data = pick(req.body, ["question", "answer", "order", "is_active"]);
    if (!String(data.question || "").trim()) return res.status(400).json({ message: "Thiếu question" });
    if (!String(data.answer || "").trim()) return res.status(400).json({ message: "Thiếu answer" });
    const doc = await FaqItem.create({
      question: String(data.question || "").trim(),
      answer: String(data.answer || "").trim(),
      order: toNum(data.order, 0),
      is_active: toBool(data.is_active, true),
    });
    res.status(201).json(doc);
  } catch (e) {
    res.status(400).json({ message: e.message });
  }
}

export async function adminUpdateFaq(req, res) {
  try {
    const data = pick(req.body, ["question", "answer", "order", "is_active"]);
    const patch = {};
    if (data.question !== undefined) patch.question = String(data.question || "").trim();
    if (data.answer !== undefined) patch.answer = String(data.answer || "").trim();
    if (data.order !== undefined) patch.order = toNum(data.order, 0);
    if (data.is_active !== undefined) patch.is_active = toBool(data.is_active, true);
    const doc = await FaqItem.findByIdAndUpdate(req.params.id, patch, { new: true, runValidators: true });
    if (!doc) return res.status(404).json({ message: "Not found" });
    res.json(doc);
  } catch (e) {
    res.status(400).json({ message: e.message });
  }
}

export async function adminDeleteFaq(req, res) {
  try {
    const doc = await FaqItem.findByIdAndDelete(req.params.id);
    if (!doc) return res.status(404).json({ message: "Not found" });
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
}

export async function adminListNewsletter(req, res) {
  try {
    const q = String(req.query.q || "").trim().toLowerCase();
    const filter = q ? { email: { $regex: q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), $options: "i" } } : {};
    const items = await NewsletterSubscriber.find(filter).sort({ createdAt: -1 }).limit(2000).lean();
    res.json({ total: items.length, items });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
}

