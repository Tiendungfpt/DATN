import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import SearchBar from "../components/SearchBar";
import ImageCarousel from "../components/ImageCarousel";
import RoomTypeCardStructured from "../components/RoomTypeCardStructured";
import { normalizeRoomTypeName } from "../constants/featuredRoomTypes";
import {
  fetchRoomTypeAvailability,
  fetchRoomTypeCatalog,
  normalizeTypeName,
} from "../services/availabilityApi";
import "./style/Home.css";
export default function Home() {
  const fallbackRoomImage =
    "https://images.unsplash.com/photo-1631049307264-da0ec9d70304?q=80&w=2070&auto=format&fit=crop";
  const heroSlideFallbacks = [
    "https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=2200&q=80",
    "https://images.unsplash.com/photo-1582719508461-905c673771fd?auto=format&fit=crop&w=2200&q=80",
    "https://images.unsplash.com/photo-1618773928121-c32242e63f39?auto=format&fit=crop&w=2200&q=80",
    "https://images.unsplash.com/photo-1578683010236-d716f9a3f461?auto=format&fit=crop&w=2200&q=80",
  ];

  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [roomsNotice, setRoomsNotice] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);
  const [ratings, setRatings] = useState({});
  const [availabilityByTypeId, setAvailabilityByTypeId] = useState({});
  const [availabilityByName, setAvailabilityByName] = useState({});
  const [descriptionByTypeId, setDescriptionByTypeId] = useState({});
  const [descriptionByName, setDescriptionByName] = useState({});
  const [complimentaryByTypeId, setComplimentaryByTypeId] = useState({});
  const [complimentaryByName, setComplimentaryByName] = useState({});
  const [priceByTypeId, setPriceByTypeId] = useState({});
  const [priceByName, setPriceByName] = useState({});
  const [capacityByTypeId, setCapacityByTypeId] = useState({});
  const [capacityByName, setCapacityByName] = useState({});
  const [siteAmenities, setSiteAmenities] = useState([]);
  const [siteGallery, setSiteGallery] = useState([]);
  const [siteExternalRatings, setSiteExternalRatings] = useState([]);
  const [siteLocation, setSiteLocation] = useState({ places: [] });
  const [siteFaqs, setSiteFaqs] = useState([]);
  const [siteRecentReviews, setSiteRecentReviews] = useState([]);
  const [siteLoading, setSiteLoading] = useState(true);
  const [faqOpen, setFaqOpen] = useState(0);
  const [galleryOpen, setGalleryOpen] = useState(false);
  const [activeGalleryIdx, setActiveGalleryIdx] = useState(0);
  const [heroIdx, setHeroIdx] = useState(0);
  const [heroSlides, setHeroSlides] = useState(heroSlideFallbacks);
  const [newsletterEmail, setNewsletterEmail] = useState("");

  const resolveHeroImage = (value) => {
    const raw = String(value || "").trim();
    if (!raw) return "";
    if (raw.startsWith("http://") || raw.startsWith("https://")) return raw;
    if (raw.startsWith("//")) return `https:${raw}`;
    if (raw.startsWith("/")) return raw;
    return `/uploads/${raw}`;
  };

  useEffect(() => {
    const loadSite = async () => {
      try {
        setSiteLoading(true);
        const [amenRes, galRes, ratRes, locRes, faqRes] = await Promise.all([
          fetch("/api/site/amenities?limit=8").then((r) => r.json()),
          fetch("/api/site/gallery").then((r) => r.json()),
          fetch("/api/site/ratings").then((r) => r.json()),
          fetch("/api/site/location?limit=6").then((r) => r.json()),
          fetch("/api/site/faqs?limit=5").then((r) => r.json()),
        ]);
        setSiteAmenities(Array.isArray(amenRes?.items) ? amenRes.items : []);
        setSiteGallery(Array.isArray(galRes?.items) ? galRes.items : []);
        setSiteExternalRatings(Array.isArray(ratRes?.items) ? ratRes.items : []);
        setSiteLocation(locRes && typeof locRes === "object" ? locRes : { places: [] });
        setSiteFaqs(Array.isArray(faqRes?.items) ? faqRes.items : []);
        try {
          const rr = await fetch("/api/site/reviews?limit=3").then((r) => r.json());
          setSiteRecentReviews(Array.isArray(rr?.items) ? rr.items : []);
        } catch {
          setSiteRecentReviews([]);
        }
      } catch {
        setSiteAmenities([]);
        setSiteGallery([]);
        setSiteExternalRatings([]);
        setSiteLocation({ places: [] });
        setSiteFaqs([]);
        setSiteRecentReviews([]);
      } finally {
        setSiteLoading(false);
      }
    };
    loadSite();
  }, []);
  useEffect(() => {
    const list = Array.isArray(rooms) ? rooms : [];
    const fetchRatings = async () => {
      const ratingData = {};
      await Promise.all(
        list.map(async (room) => {
          const rid = room?._id;
          if (!rid) return;
          try {
            const res = await fetch(
              `/api/reviews/room/${rid}/summary?aggregateByType=1`,
            );
            const data = await res.json();
            ratingData[rid] = data;
          } catch {
            ratingData[rid] = { avg: 0, total: 0 };
          }
        }),
      );
      setRatings(ratingData);
    };
    if (list.length > 0) {
      fetchRatings();
    }
  }, [rooms]);

  useEffect(() => {
    try {
      const user = JSON.parse(localStorage.getItem("user") || "null");
      setIsAdmin(user?.role === "admin");
    } catch {
      setIsAdmin(false);
    }
  }, []);

  useEffect(() => {
    const fetchRooms = async () => {
      try {
        // Try full room list first, fallback to featured endpoint if server can't serve it.
        let res = await fetch("/api/rooms");
        if (!res.ok) {
          res = await fetch("/api/rooms/featured");
        }
        if (!res.ok) throw new Error(`Lỗi server: ${res.status}`);
        const data = await res.json();
        let list = Array.isArray(data) ? data : data?.data || data?.result || [];
        if (!Array.isArray(list)) list = [];

        const repByType = new Map();
        for (const r of list) {
          const typeKey = String(r.roomType || r.room_type || r.name || "");
          const norm = normalizeRoomTypeName(typeKey);
          if (!repByType.has(norm)) repByType.set(norm, r);
        }
        setRooms([...repByType.values()]);
        setRoomsNotice("");
      } catch (err) {
        console.error("Lỗi khi lấy dữ liệu:", err);
        setRooms([]);
        setRoomsNotice("Không tải được danh sách phòng lúc này. Vui lòng thử lại sau.");
      } finally {
        setLoading(false);
      }
    };

    fetchRooms();
  }, []);

  useEffect(() => {
    const fetchAvailability = async () => {
      try {
        const [items, roomTypes] = await Promise.all([
          fetchRoomTypeAvailability(),
          fetchRoomTypeCatalog(),
        ]);
        const byId = {};
        const byName = {};
        items.forEach((item) => {
          byId[String(item.room_type_id)] = Number(item.available_count) || 0;
          byName[normalizeTypeName(item.name)] = Number(item.available_count) || 0;
        });
        const descById = {};
        const descByName = {};
        const compById = {};
        const compByName = {};
        const priceMapById = {};
        const priceMapByName = {};
        const capMapById = {};
        const capMapByName = {};
        roomTypes.forEach((rt) => {
          const desc = String(rt.description || "").trim();
          const comp = Array.isArray(rt.complimentary_services)
            ? rt.complimentary_services.map((s) => String(s?.name || "").trim()).filter(Boolean)
            : [];
          const price = Number(rt.price || 0);
          const cap = Number(rt.maxGuests ?? rt.max_guests ?? 0) || 0;
          const typeNameNorm = normalizeTypeName(rt.name);
          descById[String(rt._id)] = desc;
          descByName[typeNameNorm] = desc;
          compById[String(rt._id)] = comp;
          compByName[typeNameNorm] = comp;
          priceMapById[String(rt._id)] = price;
          priceMapByName[typeNameNorm] = price;
          capMapById[String(rt._id)] = cap;
          capMapByName[typeNameNorm] = cap;
          if (rt.code) {
            const codeNorm = normalizeTypeName(rt.code);
            descByName[codeNorm] = desc;
            compByName[codeNorm] = comp;
            priceMapByName[codeNorm] = price;
            capMapByName[codeNorm] = cap;
          }
        });
        setAvailabilityByTypeId(byId);
        setAvailabilityByName(byName);
        setDescriptionByTypeId(descById);
        setDescriptionByName(descByName);
        setComplimentaryByTypeId(compById);
        setComplimentaryByName(compByName);
        setPriceByTypeId(priceMapById);
        setPriceByName(priceMapByName);
        setCapacityByTypeId(capMapById);
        setCapacityByName(capMapByName);
      } catch {
        setAvailabilityByTypeId({});
        setAvailabilityByName({});
        setDescriptionByTypeId({});
        setDescriptionByName({});
        setComplimentaryByTypeId({});
        setComplimentaryByName({});
        setPriceByTypeId({});
        setPriceByName({});
        setCapacityByTypeId({});
        setCapacityByName({});
      }
    };
    fetchAvailability();
  }, []);

  useEffect(() => {
    let cancelled = false;
    const candidates = [
      ...(Array.isArray(siteGallery) ? siteGallery : [])
        .map((g) => resolveHeroImage(g?.url))
        .filter(Boolean),
      ...heroSlideFallbacks.map(resolveHeroImage),
    ];
    const uniqueCandidates = [...new Set(candidates)].slice(0, 8);

    const testImage = (src) =>
      new Promise((resolve) => {
        const img = new Image();
        img.onload = () => resolve(src);
        img.onerror = () => resolve(null);
        img.src = src;
      });

    (async () => {
      const checked = await Promise.all(uniqueCandidates.map(testImage));
      if (cancelled) return;
      const valid = checked.filter(Boolean).slice(0, 6);
      const fallbackResolved = heroSlideFallbacks.map(resolveHeroImage);
      setHeroSlides(valid.length > 0 ? valid : fallbackResolved);
      setHeroIdx(0);
    })();

    return () => {
      cancelled = true;
    };
  }, [siteGallery]);

  const galleryFallback = (seed) => `https://picsum.photos/seed/home-gallery-${encodeURIComponent(seed)}/1600/1000`;
  const gallery = (() => {
    const list = (Array.isArray(siteGallery) ? siteGallery : []).map((g) => String(g?.url || "").trim()).filter(Boolean);
    const out = [...new Set(list)];
    while (out.length < 5) out.push(galleryFallback(out.length + 1));
    return out.slice(0, 5);
  })();

  useEffect(() => {
    if (heroSlides.length <= 1) return undefined;
    const timer = window.setInterval(() => {
      setHeroIdx((i) => (i + 1) % heroSlides.length);
    }, 4600);
    return () => window.clearInterval(timer);
  }, [heroSlides.length]);

  if (loading) {
    return (
      <div
        className="d-flex justify-content-center align-items-center py-5"
        style={{ minHeight: "60vh" }}
      >
        <div
          className="spinner-border text-primary"
          role="status"
          style={{ width: "3rem", height: "3rem" }}
        >
          <span className="visually-hidden">Đang tải...</span>
        </div>
      </div>
    );
  }

  const displayRooms = Array.isArray(rooms) ? rooms : [];
  const amenities = (Array.isArray(siteAmenities) ? siteAmenities : []).map((a) => ({
    icon: a.icon || "✨",
    title: a.title,
    desc: a.description || "",
  }));

  const aggregateRatings = (Array.isArray(siteExternalRatings) ? siteExternalRatings : []).map((r) => ({
    name: r.platform,
    score: r.score,
    total: r.total,
  }));

  const featuredReviews = (Array.isArray(siteRecentReviews) ? siteRecentReviews : []).map((rv) => ({
    name: rv?.user_id?.name || "Khách hàng",
    source: rv?.room_id?.name ? `Phòng: ${rv.room_id.name}` : "Đánh giá",
    rating: `${Number(rv?.rating || 0)}/5`,
    content: String(rv?.comment || "").trim() || "—",
  }));

  const distances = (Array.isArray(siteLocation?.places) ? siteLocation.places : []).map((p) => ({
    place: p.name,
    km: p.distance_km,
    time: p.eta_text,
  }));
  const mapQueryRaw =
    siteLocation?.map?.query ||
    siteLocation?.map?.address ||
    siteLocation?.map_query ||
    siteLocation?.map_placeholder?.query ||
    "123 Đường Nguyễn Trãi, Quận Thanh Xuân, Hà Nội, Việt Nam";
  const mapQuery = encodeURIComponent(
    String(mapQueryRaw || "123 Đường Nguyễn Trãi, Quận Thanh Xuân, Hà Nội, Việt Nam").trim(),
  );
  const mapEmbedUrl = `https://www.google.com/maps?q=${mapQuery}&z=15&output=embed`;
  const mapOpenUrl = `https://www.google.com/maps/search/?api=1&query=${mapQuery}`;

  const faqs = (Array.isArray(siteFaqs) ? siteFaqs : []).map((f) => ({ q: f.question, a: f.answer }));

  return (
    <>
      <section className="home-hero">
        <div className="home-hero-bg">
          {heroSlides.map((img, idx) => (
            <div
              key={`${img}-${idx}`}
              className={`home-hero-slide ${idx === heroIdx ? "is-active" : ""}`}
              style={{ backgroundImage: `url(${img})` }}
            />
          ))}
        </div>
        <div className="hh-container home-hero-inner">
          <h1 className="home-hero-title">Thịnh Phát Hotel</h1>
          <div className="home-hero-subtitle">Live Oriental Heritage</div>
          <div className="home-hero-dots" aria-label="Hero slides">
            {heroSlides.map((_, idx) => (
              <button
                key={idx}
                type="button"
                className={`home-hero-dot ${idx === heroIdx ? "is-active" : ""}`}
                aria-label={`Chuyển banner ${idx + 1}`}
                onClick={() => setHeroIdx(idx)}
              />
            ))}
          </div>
        </div>
        <SearchBar />
      </section>

      {/* Amenities */}
      <section className="hh-sec hh-sec--amenities">
        <div className="hh-container">
          <div className="hh-sec-head">
            <h2>Tiện ích nổi bật</h2>
            <p>8 tiện ích tiêu biểu giúp chuyến đi của bạn thoải mái hơn.</p>
          </div>
          <div className="hh-amen-grid" aria-label="Amenities">
            {siteLoading ? (
              <div style={{ gridColumn: "1 / -1", color: "rgba(15,23,42,0.65)" }}>Đang tải…</div>
            ) : null}
            {amenities.map((it) => (
              <div key={it.title} className="hh-amen-card">
                <div className="hh-amen-ic" aria-hidden="true">{it.icon}</div>
                <div className="hh-amen-body">
                  <div className="hh-amen-title">{it.title}</div>
                  <div className="hh-amen-desc">{it.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Gallery */}
      <section className="hh-sec hh-sec--gallery">
        <div className="hh-container">
          <div className="hh-sec-head hh-sec-head--row">
            <div>
              <h2>Gallery</h2>
              <p>Không gian thực tế tại khách sạn và hạng phòng.</p>
            </div>
            <button type="button" className="hh-btn-outline" onClick={() => setGalleryOpen(true)}>
              Xem tất cả ảnh
            </button>
          </div>

          <div className="hh-gallery-showcase" aria-label="Gallery preview">
            <ImageCarousel
              images={gallery}
              alt="Không gian khách sạn"
              autoPlay
              intervalMs={3400}
              showArrows
              showDots
              className="hh-home-gallery-carousel"
            />
            <div className="hh-gallery-thumbs">
              {gallery.map((src, idx) => (
                <button
                  type="button"
                  key={`${src}-${idx}`}
                  className="hh-gallery-thumb"
                  onClick={() => {
                    setActiveGalleryIdx(idx);
                    setGalleryOpen(true);
                  }}
                  aria-label={`Mở ảnh ${idx + 1}`}
                >
                  <img
                    src={src}
                    alt={`thumbnail-${idx + 1}`}
                    loading="lazy"
                    onError={(e) => {
                      e.currentTarget.onerror = null;
                      e.currentTarget.src = `https://picsum.photos/seed/gallery-thumb-fallback-${idx + 1}/400/240`;
                    }}
                  />
                </button>
              ))}
            </div>
          </div>
        </div>

        {galleryOpen ? (
          <div
            className="hh-lightbox"
            role="dialog"
            aria-modal="true"
            onClick={(e) => {
              if (e.target === e.currentTarget) setGalleryOpen(false);
            }}
          >
            <button type="button" className="hh-lightbox-close" onClick={() => setGalleryOpen(false)} aria-label="Đóng">
              ×
            </button>
            <button
              type="button"
              className="hh-lightbox-nav left"
              onClick={() => setActiveGalleryIdx((i) => (i - 1 + gallery.length) % gallery.length)}
              aria-label="Ảnh trước"
            >
              ‹
            </button>
            <img className="hh-lightbox-img" src={gallery[activeGalleryIdx] || ""} alt="Ảnh lớn" />
            <button
              type="button"
              className="hh-lightbox-nav right"
              onClick={() => setActiveGalleryIdx((i) => (i + 1) % gallery.length)}
              aria-label="Ảnh sau"
            >
              ›
            </button>
            <div className="hh-lightbox-meta">
              {activeGalleryIdx + 1} / {gallery.length}
            </div>
          </div>
        ) : null}
      </section>

      {/* Reviews */}
      <section className="hh-sec hh-sec--reviews">
        <div className="hh-container">
          <div className="hh-sec-head">
            <h2>Reviews</h2>
            <p>Điểm tổng hợp từ các nền tảng phổ biến và một vài đánh giá thực tế.</p>
          </div>

          <div className="hh-rating-grid" aria-label="Aggregate ratings">
            {siteLoading ? (
              <div style={{ gridColumn: "1 / -1", color: "rgba(15,23,42,0.65)" }}>Đang tải…</div>
            ) : null}
            {aggregateRatings.map((r) => (
              <div key={r.name} className="hh-rating-card">
                <div className="hh-rating-name">{r.name}</div>
                <div className="hh-rating-score">{r.score}</div>
                <div className="hh-rating-sub">{r.total.toLocaleString("vi-VN")} lượt đánh giá</div>
              </div>
            ))}
          </div>

          <div className="hh-review-list" aria-label="Featured reviews">
            {featuredReviews.map((rv) => (
              <article key={rv.name + rv.source} className="hh-review-card">
                <header className="hh-review-head">
                  <div className="hh-review-who">
                    <strong>{rv.name}</strong>
                    <span className="hh-review-src">{rv.source}</span>
                  </div>
                  <div className="hh-review-rate">{rv.rating}</div>
                </header>
                <p className="hh-review-body">{rv.content}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* Location */}
      <section className="hh-sec hh-sec--location">
        <div className="hh-container">
          <div className="hh-sec-head">
            <h2>Vị trí & Bản đồ</h2>
            <p>Bản đồ khách sạn và khoảng cách tới các địa điểm phổ biến.</p>
          </div>

          <div className="hh-loc-grid">
            <div className="hh-map" aria-label="Bản đồ khách sạn">
              <iframe
                className="hh-map-frame"
                src={mapEmbedUrl}
                title="Bản đồ khách sạn"
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
              />
              <a className="hh-map-link" href={mapOpenUrl} target="_blank" rel="noreferrer">
                Mở trên Google Maps ↗
              </a>
            </div>
            <div className="hh-distance">
              {siteLoading ? <div style={{ padding: 10, color: "rgba(15,23,42,0.65)" }}>Đang tải…</div> : null}
              {distances.map((d) => (
                <div key={d.place} className="hh-distance-row">
                  <div className="hh-distance-place">{d.place}</div>
                  <div className="hh-distance-meta">
                    <span>{d.km}</span>
                    <span className="dot">•</span>
                    <span>{d.time}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="hh-sec hh-sec--faq">
        <div className="hh-container">
          <div className="hh-sec-head">
            <h2>FAQ</h2>
            <p>5 câu hỏi phổ biến nhất trước khi đặt phòng.</p>
          </div>
          <div className="hh-faq" role="region" aria-label="FAQ accordion">
            {siteLoading ? <div style={{ padding: 14, color: "rgba(15,23,42,0.65)" }}>Đang tải…</div> : null}
            {faqs.map((f, idx) => {
              const open = faqOpen === idx;
              return (
                <div key={f.q} className={`hh-faq-item${open ? " is-open" : ""}`}>
                  <button
                    type="button"
                    className="hh-faq-q"
                    onClick={() => setFaqOpen((v) => (v === idx ? -1 : idx))}
                    aria-expanded={open}
                  >
                    <span>{f.q}</span>
                    <span className="hh-faq-ic" aria-hidden="true">{open ? "−" : "+"}</span>
                  </button>
                  {open ? <div className="hh-faq-a">{f.a}</div> : null}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Newsletter */}
      <section className="hh-sec hh-sec--news">
        <div className="hh-container">
          <div className="hh-news">
            <div>
              <h2>Nhận ưu đãi mới nhất</h2>
              <p>Đăng ký email để nhận mã giảm giá và ưu đãi theo mùa.</p>
            </div>
            <form
              className="hh-news-form"
              onSubmit={(e) => {
                e.preventDefault();
                if (!String(newsletterEmail).trim()) return;
                (async () => {
                  try {
                    const res = await fetch("/api/site/newsletter", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ email: newsletterEmail }),
                    });
                    if (!res.ok) throw new Error("newsletter_failed");
                    alert("Đã đăng ký nhận ưu đãi. Cảm ơn bạn!");
                    setNewsletterEmail("");
                  } catch {
                    alert("Không đăng ký được. Vui lòng thử lại.");
                  }
                })();
              }}
            >
              <input
                value={newsletterEmail}
                onChange={(e) => setNewsletterEmail(e.target.value)}
                className="hh-news-input"
                placeholder="Email của bạn"
                type="email"
              />
              <button className="hh-news-btn" type="submit">Đăng ký</button>
            </form>
          </div>
        </div>
      </section>

      <section className="py-5 bg-light">
        <div className="container">
          {roomsNotice ? (
            <div className="alert alert-warning mb-4" role="alert">
              {roomsNotice}
            </div>
          ) : null}
          <div className="d-flex justify-content-between align-items-end mb-4">
            <div>
              <h3 className="fw-bold mb-1">Ưu đãi nổi bật</h3>
              <p className="text-muted">
                {displayRooms.length > 0
                  ? `${displayRooms.length} loại phòng nổi bật`
                  : "Khám phá các loại phòng nổi bật"}
              </p>
            </div>
            <Link to="/khach-san" className="text-primary fw-medium text-decoration-none">
              Xem tất cả →
            </Link>
          </div>

          {displayRooms.length === 0 ? (
            <div className="text-center py-5">
              <p className="text-muted fs-5">Hiện chưa có phòng nào.</p>
            </div>
          ) : (
            <div className="row g-4">
              {displayRooms.map((room) => (
                <div className="col-md-6 col-lg-4" key={room._id}>
                  <RoomTypeCardStructured
                    room={room}
                    imageSrc={
                      room.image?.startsWith("http")
                        ? room.image
                        : room.image
                          ? `/uploads/${room.image}`
                          : fallbackRoomImage
                    }
                    ratingAvg={ratings[room._id]?.avg ?? 0}
                    ratingTotal={ratings[room._id]?.total ?? 0}
                    availableCount={
                      room.roomType
                        ? (availabilityByTypeId[String(room.roomType)] ?? 0)
                        : (availabilityByName[normalizeTypeName(room.name)] ?? 0)
                    }
                    description={
                      room.roomType
                        ? descriptionByTypeId[String(room.roomType)] || "Mô tả đang cập nhật."
                        : descriptionByName[normalizeTypeName(room.name)] ||
                          "Mô tả đang cập nhật."
                    }
                    complimentaryServices={
                      room.roomType
                        ? complimentaryByTypeId[String(room.roomType)] || []
                        : complimentaryByName[normalizeTypeName(room.name)] || []
                    }
                    priceOverride={
                      room.roomType
                        ? priceByTypeId[String(room.roomType)]
                        : priceByName[normalizeTypeName(room.name)]
                    }
                    capacityOverride={
                      room.roomType
                        ? capacityByTypeId[String(room.roomType)]
                        : capacityByName[normalizeTypeName(room.name)]
                    }
                    showBookButton={!isAdmin}
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    </>
  );
}
