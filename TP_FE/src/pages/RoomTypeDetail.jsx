import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import axios from "axios";
import { fetchRoomTypeCatalog } from "../services/availabilityApi";
import "./style/RoomTypeDetail.css";

const fallbackHero =
  "https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=2400&q=80";

function resolveImage(img) {
  const raw = String(img || "").trim();
  if (!raw) return fallbackHero;
  if (raw.startsWith("http://") || raw.startsWith("https://")) return raw;
  if (raw.startsWith("//")) return `https:${raw}`;
  return `/uploads/${raw}`;
}

export default function RoomTypeDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [roomType, setRoomType] = useState(null);
  const [catalog, setCatalog] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [selectedImage, setSelectedImage] = useState("");

  useEffect(() => {
    if (!id) return;
    (async () => {
      try {
        setLoading(true);
        setErr("");
        const res = await axios.get(`/api/room-types/${id}`);
        setRoomType(res.data || null);
        try {
          const list = await fetchRoomTypeCatalog();
          setCatalog(Array.isArray(list) ? list : []);
        } catch {
          setCatalog([]);
        }
      } catch (e) {
        setRoomType(null);
        setErr(e.response?.data?.message || "Không tải được chi tiết hạng phòng.");
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  const allImages = useMemo(() => {
    const base = [];
    if (roomType?.image) base.push(roomType.image);
    if (Array.isArray(roomType?.images)) base.push(...roomType.images);
    const normalized = base
      .map((img) => resolveImage(img))
      .filter(Boolean);
    return [...new Set(normalized)];
  }, [roomType?.image, roomType?.images]);

  useEffect(() => {
    if (allImages.length > 0) {
      setSelectedImage(allImages[0]);
      return;
    }
    setSelectedImage(resolveImage(roomType?.image));
  }, [allImages, roomType?.image]);

  const heroImage = selectedImage || resolveImage(roomType?.image);
  const vatNote = "Đã bao gồm VAT";

  const compareTiers = useMemo(() => {
    const list = Array.isArray(catalog) ? catalog : [];
    const valid = list
      .filter((x) => x && x._id && x.name)
      .map((x) => ({
        _id: String(x._id),
        name: String(x.name),
        price: Number(x.price || 0),
        maxGuests: Number(x.maxGuests ?? x.max_guests ?? 2),
        area: Number(x.area_sqm || x.area || 0),
      }))
      .sort((a, b) => a.price - b.price);
    if (valid.length === 0 && roomType?._id) {
      return [
        {
          _id: String(roomType._id),
          name: String(roomType.name || "Hạng phòng"),
          price: Number(roomType.price || 0),
          maxGuests: Number(roomType.maxGuests ?? roomType.max_guests ?? 2),
          area: Number(roomType.area_sqm || 0),
        },
      ];
    }
    // pick up to 3 tiers around current roomType (or first 3)
    const curId = String(roomType?._id || "");
    const idx = valid.findIndex((v) => v._id === curId);
    if (idx === -1) return valid.slice(0, 3);
    const start = Math.max(0, Math.min(valid.length - 3, idx - 1));
    return valid.slice(start, start + 3);
  }, [catalog, roomType?._id, roomType?.name, roomType?.price, roomType?.maxGuests, roomType?.max_guests, roomType?.area_sqm]);

  const mostPopularId = useMemo(() => {
    if (compareTiers.length === 0) return "";
    // mark middle tier as "Phổ biến nhất" when 3 tiers, else current
    if (compareTiers.length >= 3) return compareTiers[1]._id;
    return String(roomType?._id || compareTiers[0]._id || "");
  }, [compareTiers, roomType?._id]);

  const complimentaryServices = useMemo(() => {
    const list = Array.isArray(roomType?.complimentary_services) ? roomType.complimentary_services : [];
    return list
      .map((s) => {
        const name = String(s?.name || "").trim();
        if (!name) return "";
        return name;
      })
      .filter(Boolean);
  }, [roomType?.complimentary_services]);

  const title = roomType?.name || "Chi tiết hạng phòng";
  const subtitle = roomType?.code ? String(roomType.code).replace(/_/g, " ") : "Nghỉ dưỡng hoàn hảo";
  const description =
    String(roomType?.description || "").trim() ||
    "Trải nghiệm lưu trú sang trọng với không gian ấm cúng, tiện nghi hiện đại và dịch vụ tận tâm.";

  if (loading) return <div className="rtd-shell rtd-loading">Đang tải…</div>;
  if (err) return <div className="rtd-shell rtd-error">{err}</div>;
  if (!roomType) return <div className="rtd-shell rtd-error">Không tìm thấy hạng phòng.</div>;

  return (
    <div className="rtd-shell">
      <section
        className="rtd-hero"
        style={{
          backgroundImage: `linear-gradient(rgba(0,0,0,.45), rgba(0,0,0,.1)), url(${heroImage})`,
        }}
      >
        <div className="rtd-hero-inner">
          <div className="rtd-hero-breadcrumb">
            <Link to="/">Trang chủ</Link>
            <span>/</span>
            <Link to="/khach-san">Hạng phòng</Link>
            <span>/</span>
            <strong>{title}</strong>
          </div>
          <h1 className="rtd-title">{title}</h1>
          <div className="rtd-subtitle">{subtitle}</div>
          <div className="rtd-hero-stats">
            <div className="rtd-hero-stat">
              <span>Sức chứa</span>
              <strong>{roomType.maxGuests ?? roomType.max_guests ?? 2} khách</strong>
            </div>
            <div className="rtd-hero-stat">
              <span>Giá từ</span>
              <strong>{Number(roomType.price || 0).toLocaleString("vi-VN")} ₫ /đêm</strong>
            </div>
            <div className="rtd-hero-stat">
              <span>Tiền cọc</span>
              <strong>{Number(roomType.deposit_amount || 0).toLocaleString("vi-VN")} ₫</strong>
            </div>
          </div>
          <div className="rtd-hero-actions">
            <button
              type="button"
              className="rtd-btn rtd-btn-primary"
              onClick={() => navigate(`/book?room_type_id=${encodeURIComponent(String(roomType._id))}`)}
            >
              Đặt phòng
            </button>
            <Link className="rtd-btn rtd-btn-ghost" to="/khach-san">
              Xem các hạng phòng khác
            </Link>
          </div>
        </div>
      </section>

      <main className="rtd-main">
        <div className="rtd-grid">
          <div className="rtd-image-wrap">
            <div className="rtd-image">
              <img src={heroImage} alt={title} onError={(e) => (e.currentTarget.src = fallbackHero)} />
            </div>
            {allImages.length > 1 ? (
              <div className="rtd-gallery">
                {allImages.map((img, idx) => {
                  const isActive = img === heroImage;
                  return (
                    <button
                      key={`${img}-${idx}`}
                      type="button"
                      className={`rtd-thumb${isActive ? " is-active" : ""}`}
                      onClick={() => setSelectedImage(img)}
                      aria-label={`Xem ảnh ${idx + 1}`}
                    >
                      <img src={img} alt={`${title} ${idx + 1}`} loading="lazy" />
                    </button>
                  );
                })}
              </div>
            ) : null}
            <div className="rtd-image-badges">
              <span>{allImages.length} ảnh thực tế</span>
              <span>Không hút thuốc</span>
              <span>Wifi miễn phí</span>
              <span>Dịch vụ 24/7</span>
            </div>
          </div>

          <div className="rtd-content">
            <h2 className="rtd-content-title">{title}</h2>
            <p className="rtd-desc">{description}</p>

            <div className="rtd-meta">
              <div className="rtd-meta-item">
                <div className="rtd-meta-k">Sức chứa</div>
                <div className="rtd-meta-v">{roomType.maxGuests ?? roomType.max_guests ?? 2} người</div>
              </div>
              <div className="rtd-meta-item">
                <div className="rtd-meta-k">Giá</div>
                <div className="rtd-meta-v">
                  {Number(roomType.price || 0).toLocaleString("vi-VN")} ₫/đêm{" "}
                  <span className="rtd-vat">({vatNote})</span>
                </div>
              </div>
              <div className="rtd-meta-item">
                <div className="rtd-meta-k">Tiền cọc</div>
                <div className="rtd-meta-v">
                  {Number(roomType.deposit_amount || 0).toLocaleString("vi-VN")} ₫
                </div>
              </div>
            </div>

            <div className="rtd-primary-cta">
              <button
                type="button"
                className="rtd-btn rtd-btn-primary"
                onClick={() => navigate(`/book?room_type_id=${encodeURIComponent(String(roomType._id))}`)}
              >
                Đặt phòng ngay
              </button>
              <Link className="rtd-btn rtd-btn-inline" to="/khach-san">
                Xem thêm hạng phòng
              </Link>
            </div>

            <div className="rtd-divider" />

            <div className="rtd-compare-head">
              <h3 className="rtd-h3" style={{ marginBottom: 0 }}>So sánh các hạng phòng</h3>
              <div className="rtd-compare-sub">Chọn nhanh hạng phù hợp theo nhu cầu.</div>
            </div>
            <div className="rtd-compare-grid" aria-label="Bảng so sánh hạng phòng">
              {compareTiers.map((t) => {
                const isPopular = String(t._id) === String(mostPopularId);
                const isCurrent = String(t._id) === String(roomType._id);
                return (
                  <article key={t._id} className={`rtd-tier${isPopular ? " is-popular" : ""}${isCurrent ? " is-current" : ""}`}>
                    <div className="rtd-tier-top">
                      <div className="rtd-tier-name">{t.name}</div>
                      {isPopular ? <div className="rtd-badge">Phổ biến nhất</div> : null}
                    </div>
                    <div className="rtd-tier-price">
                      {Number(t.price || 0).toLocaleString("vi-VN")} ₫ <span> /đêm</span>
                    </div>
                    <div className="rtd-tier-note">{vatNote}</div>
                    <div className="rtd-tier-meta">
                      <span>👤 {t.maxGuests || 2} khách</span>
                      <span>•</span>
                      <span>📐 {t.area ? `${t.area}m²` : "—"}</span>
                    </div>
                    <div className="rtd-tier-actions">
                      <button
                        type="button"
                        className="rtd-tier-btn"
                        onClick={() => navigate(`/hang-phong/${encodeURIComponent(String(t._id))}`)}
                      >
                        Xem
                      </button>
                      <button
                        type="button"
                        className="rtd-tier-btn primary"
                        onClick={() => navigate(`/book?room_type_id=${encodeURIComponent(String(t._id))}`)}
                      >
                        Đặt
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>

            <div className="rtd-divider" />

            <h3 className="rtd-h3">Tiện nghi</h3>
            {complimentaryServices.length > 0 ? (
              <ul className="rtd-amenities">
                {complimentaryServices.map((s) => (
                  <li key={s}>{s}</li>
                ))}
              </ul>
            ) : (
              <p className="rtd-desc" style={{ marginTop: 0 }}>
                Loại phòng này chưa cấu hình dịch vụ miễn phí đi kèm.
              </p>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

