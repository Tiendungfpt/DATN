import Amenity from "../models/Amenity.js";
import GalleryImage from "../models/GalleryImage.js";
import LocationPlace from "../models/LocationPlace.js";
import FaqItem from "../models/FaqItem.js";
import NewsletterSubscriber from "../models/NewsletterSubscriber.js";
import Review from "../models/Review.js";

function safeLimit(raw, def, max) {
  const n = Number.parseInt(String(raw ?? def), 10);
  if (!Number.isFinite(n)) return def;
  return Math.min(Math.max(n, 1), max);
}

export async function listAmenities(req, res) {
  try {
    const limit = safeLimit(req.query.limit, 8, 50);
    const items = await Amenity.find({ is_active: true })
      .sort({ order: 1, _id: 1 })
      .limit(limit)
      .lean();
    return res.json({ items });
  } catch (e) {
    return res.status(500).json({ message: e.message });
  }
}

export async function listGallery(req, res) {
  try {
    const limit = safeLimit(req.query.limit, 50, 200);
    const items = await GalleryImage.find({ is_active: true })
      .sort({ order: 1, _id: 1 })
      .limit(limit)
      .lean();
    return res.json({ items });
  } catch (e) {
    return res.status(500).json({ message: e.message });
  }
}

export async function listRatings(req, res) {
  try {
    const rows = await Review.aggregate([
      { $match: { isHidden: { $ne: true } } },
      {
        $group: {
          _id: null,
          avg: { $avg: "$rating" },
          total: { $sum: 1 },
        },
      },
    ]);
    const avg5 = Number(rows?.[0]?.avg || 0);
    const total = Number(rows?.[0]?.total || 0);
    const round1 = (n) => Math.round(n * 10) / 10;

    const items = [
      { platform: "Google", score: round1(avg5), total, order: 1 },
      { platform: "TripAdvisor", score: round1(avg5), total, order: 2 },
      { platform: "Booking", score: round1(avg5 * 2), total, order: 3 },
      { platform: "Agoda", score: round1(avg5 * 2), total, order: 4 },
    ];
    return res.json({ items });
  } catch (e) {
    return res.status(500).json({ message: e.message });
  }
}

export async function getLocation(req, res) {
  try {
    const limit = safeLimit(req.query.limit, 6, 50);
    const websiteAddress = "123 Đường Nguyễn Trãi, Quận Thanh Xuân, Hà Nội, Việt Nam";
    const places = await LocationPlace.find({ is_active: true })
      .sort({ order: 1, _id: 1 })
      .limit(limit)
      .lean();
    return res.json({
      map: {
        query: websiteAddress,
        address: websiteAddress,
      },
      map_placeholder: {
        enabled: true,
        title: "Bản đồ (placeholder)",
        subtitle: "Tích hợp Google Maps/Leaflet có thể bật sau.",
        query: websiteAddress,
      },
      places,
    });
  } catch (e) {
    return res.status(500).json({ message: e.message });
  }
}

export async function listFaqs(req, res) {
  try {
    const limit = safeLimit(req.query.limit, 5, 50);
    const items = await FaqItem.find({ is_active: true })
      .sort({ order: 1, _id: 1 })
      .limit(limit)
      .lean();
    return res.json({ items });
  } catch (e) {
    return res.status(500).json({ message: e.message });
  }
}

export async function subscribeNewsletter(req, res) {
  try {
    const email = String(req.body?.email || "")
      .trim()
      .toLowerCase();
    if (!email || !email.includes("@")) {
      return res.status(400).json({ message: "Email không hợp lệ" });
    }
    try {
      const created = await NewsletterSubscriber.create({ email, source: "website" });
      return res.status(201).json({ ok: true, subscriber: created });
    } catch (e) {
      if (e?.code === 11000) {
        const existing = await NewsletterSubscriber.findOne({ email }).lean();
        return res.status(200).json({ ok: true, subscriber: existing, duplicated: true });
      }
      throw e;
    }
  } catch (e) {
    return res.status(500).json({ message: e.message });
  }
}

export async function listRecentReviews(req, res) {
  try {
    const limit = safeLimit(req.query.limit, 3, 20);
    const items = await Review.find({ isHidden: { $ne: true } })
      .sort({ created_at: -1 })
      .limit(limit)
      .populate("user_id", "name")
      .populate("room_id", "name room_no")
      .lean();
    return res.json({ items });
  } catch (e) {
    return res.status(500).json({ message: e.message });
  }
}

