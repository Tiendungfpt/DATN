import dotenv from "dotenv";
import mongoose from "mongoose";
import Amenity from "../models/Amenity.js";
import GalleryImage from "../models/GalleryImage.js";
import ExternalRating from "../models/ExternalRating.js";
import LocationPlace from "../models/LocationPlace.js";
import FaqItem from "../models/FaqItem.js";

dotenv.config();

const MONGO_URI =
  process.env.MONGO_URI ||
  process.env.MONGODB_URI ||
  "mongodb://127.0.0.1:27017/thinhphathotel";

async function main() {
  await mongoose.connect(MONGO_URI, { serverSelectionTimeoutMS: 8000 });

  const [amenCount, galCount, rateCount, placeCount, faqCount] = await Promise.all([
    Amenity.countDocuments(),
    GalleryImage.countDocuments(),
    ExternalRating.countDocuments(),
    LocationPlace.countDocuments(),
    FaqItem.countDocuments(),
  ]);

  const created = { amenities: 0, gallery: 0, ratings: 0, location_places: 0, faqs: 0 };

  if (amenCount === 0) {
    const amenities = [
      { key: "bed", icon: "🛏️", title: "Giường cao cấp", description: "Nệm êm ái, drap sạch sẽ mỗi ngày.", order: 1 },
      { key: "wifi", icon: "📶", title: "Wi‑Fi tốc độ cao", description: "Làm việc, giải trí mượt mà.", order: 2 },
      { key: "bath", icon: "🧖", title: "Phòng tắm tiện nghi", description: "Vòi sen nóng lạnh, đồ dùng đầy đủ.", order: 3 },
      { key: "ac", icon: "❄️", title: "Điều hoà 2 chiều", description: "Thoải mái mọi thời tiết.", order: 4 },
      { key: "safe", icon: "🧳", title: "Tủ đồ & két sắt", description: "An tâm cất giữ tư trang.", order: 5 },
      { key: "tea", icon: "☕", title: "Trà/Cà phê", description: "Miễn phí set welcome trong phòng.", order: 6 },
      { key: "clean", icon: "🧼", title: "Dọn phòng hàng ngày", description: "Chuẩn sạch sẽ, gọn gàng.", order: 7 },
      { key: "pickup", icon: "🚗", title: "Hỗ trợ đưa đón", description: "Đặt xe nhanh (có phí tuỳ tuyến).", order: 8 },
    ];
    await Amenity.insertMany(amenities);
    created.amenities = amenities.length;
  }

  if (galCount === 0) {
    const gallery = [
      { url: "https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?auto=format&fit=crop&w=1400&q=80", order: 1, alt: "hotel" },
      { url: "https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?auto=format&fit=crop&w=1400&q=80", order: 2, alt: "room" },
      { url: "https://images.unsplash.com/photo-1445019980597-93fa8acb246c?auto=format&fit=crop&w=1400&q=80", order: 3, alt: "lobby" },
      { url: "https://images.unsplash.com/photo-1563911302283-d2bc129e7570?auto=format&fit=crop&w=1400&q=80", order: 4, alt: "breakfast" },
      { url: "https://images.unsplash.com/photo-1551887373-6b8d2b1a94ba?auto=format&fit=crop&w=1400&q=80", order: 5, alt: "view" },
    ];
    await GalleryImage.insertMany(gallery);
    created.gallery = gallery.length;
  }

  if (rateCount === 0) {
    const ratings = [
      { platform: "Google", score: 4.6, total: 1250, order: 1 },
      { platform: "TripAdvisor", score: 4.5, total: 620, order: 2 },
      { platform: "Booking", score: 9.1, total: 980, order: 3 },
      { platform: "Agoda", score: 8.9, total: 740, order: 4 },
    ];
    await ExternalRating.insertMany(ratings);
    created.ratings = ratings.length;
  }

  if (placeCount === 0) {
    const places = [
      { name: "Sân bay", distance_km: "7.8 km", eta_text: "~25 phút", order: 1 },
      { name: "Trung tâm thành phố", distance_km: "1.6 km", eta_text: "~8 phút", order: 2 },
      { name: "Ga tàu", distance_km: "2.1 km", eta_text: "~10 phút", order: 3 },
      { name: "Phố đi bộ", distance_km: "1.2 km", eta_text: "~6 phút", order: 4 },
      { name: "Chợ đêm", distance_km: "1.9 km", eta_text: "~9 phút", order: 5 },
      { name: "Bãi biển", distance_km: "4.5 km", eta_text: "~15 phút", order: 6 },
    ];
    await LocationPlace.insertMany(places);
    created.location_places = places.length;
  }

  if (faqCount === 0) {
    const faqs = [
      { question: "Giờ nhận phòng/trả phòng là mấy giờ?", answer: "Nhận phòng từ 14:00, trả phòng trước 12:00 hôm sau.", order: 1 },
      { question: "Có cần đặt cọc khi đặt phòng không?", answer: "Có. Hệ thống sẽ hiển thị tiền cọc theo từng hạng phòng.", order: 2 },
      { question: "Khách sạn có chỗ đậu xe không?", answer: "Có hỗ trợ đậu xe theo tình trạng chỗ trống (vui lòng liên hệ trước).", order: 3 },
      { question: "Có cho mang thú cưng không?", answer: "Hiện tại khách sạn chưa hỗ trợ thú cưng.", order: 4 },
      { question: "Có xuất hoá đơn VAT không?", answer: "Có. Vui lòng cung cấp thông tin xuất hoá đơn khi đặt phòng.", order: 5 },
    ];
    await FaqItem.insertMany(faqs);
    created.faqs = faqs.length;
  }

  const result = {
    ok: true,
    mongo: MONGO_URI,
    already_had_data: {
      amenities: amenCount > 0,
      gallery: galCount > 0,
      ratings: rateCount > 0,
      location_places: placeCount > 0,
      faqs: faqCount > 0,
    },
    created,
  };

  console.log(JSON.stringify(result, null, 2));
}

main()
  .then(async () => {
    await mongoose.disconnect();
    process.exit(0);
  })
  .catch(async (e) => {
    console.error(e);
    try {
      await mongoose.disconnect();
    } catch {
      // ignore
    }
    process.exit(1);
  });

