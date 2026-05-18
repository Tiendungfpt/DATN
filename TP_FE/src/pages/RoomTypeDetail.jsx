import { useEffect, useMemo, useState, useCallback } from "react";
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

function StarRating({ rating, size = 14 }) {
  const full = Math.floor(rating);
  const half = rating - full >= 0.5;
  return (
    <span className="rtd-stars" aria-label={`${rating} sao`}>
      {[1, 2, 3, 4, 5].map((i) => {
        const filled = i <= full;
        const isHalf = !filled && i === full + 1 && half;
        return (
          <svg
            key={i}
            width={size}
            height={size}
            viewBox="0 0 20 20"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            style={{ flexShrink: 0 }}
          >
            <defs>
              {isHalf && (
                <linearGradient id={`half-${i}`} x1="0" x2="1" y1="0" y2="0">
                  <stop offset="50%" stopColor="var(--rtd-gold)" />
                  <stop offset="50%" stopColor="var(--rtd-star-empty)" />
                </linearGradient>
              )}
            </defs>
            <path
              d="M10 1.5l2.47 5.01 5.53.8-4 3.9.94 5.49L10 14.27l-4.94 2.43.94-5.49-4-3.9 5.53-.8L10 1.5z"
              fill={
                filled
                  ? "var(--rtd-gold)"
                  : isHalf
                    ? `url(#half-${i})`
                    : "var(--rtd-star-empty)"
              }
            />
          </svg>
        );
      })}
    </span>
  );
}

function Avatar({ name }) {
  const initials = String(name || "?")
    .split(" ")
    .slice(-2)
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
  const hue =
    (name || "").split("").reduce((acc, c) => acc + c.charCodeAt(0), 0) % 360;
  return (
    <div
      className="rtd-avatar"
      style={{ background: `hsl(${hue},40%,55%)` }}
      aria-hidden="true"
    >
      {initials}
    </div>
  );
}

function RatingBar({ star, count, total }) {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0;
  return (
    <div className="rtd-rbar">
      <span className="rtd-rbar-label">{star}★</span>
      <div className="rtd-rbar-track">
        <div className="rtd-rbar-fill" style={{ width: `${pct}%` }} />
      </div>
      <span className="rtd-rbar-count">{count}</span>
    </div>
  );
}

function ReviewsSection({ roomTypeId }) {
  const [reviews, setReviews] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [roomId, setRoomId] = useState(null);
  const [visibleCount, setVisibleCount] = useState(4);

  useEffect(() => {
    if (!roomTypeId) return;
    (async () => {
      try {
        const res = await axios.get(
          `/api/rooms?room_type_id=${encodeURIComponent(roomTypeId)}&limit=1`,
        );
        const list = Array.isArray(res.data)
          ? res.data
          : res.data?.data || res.data?.rooms || [];
        if (list.length > 0) {
          setRoomId(String(list[0]._id));
        } else {
          setRoomId(roomTypeId);
        }
      } catch {
        setRoomId(roomTypeId);
      }
    })();
  }, [roomTypeId]);

  useEffect(() => {
    if (!roomId) return;
    setLoading(true);
    const qs = `?aggregateByType=1`;
    Promise.all([
      axios.get(`/api/reviews/room/${roomId}${qs}`).catch(() => ({ data: [] })),
      axios
        .get(`/api/reviews/room/${roomId}/summary${qs}`)
        .catch(() => ({ data: { total: 0, avg: "0.0" } })),
    ]).then(([revRes, sumRes]) => {
      setReviews(Array.isArray(revRes.data) ? revRes.data : []);
      setSummary(sumRes.data || { total: 0, avg: "0.0" });
      setLoading(false);
    });
  }, [roomId]);

  const breakdown = useMemo(() => {
    const counts = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
    reviews.forEach((r) => {
      const s = Math.round(r.rating);
      if (counts[s] !== undefined) counts[s]++;
    });
    return counts;
  }, [reviews]);

  const avg = parseFloat(summary?.avg || 0);
  const total = summary?.total || 0;

  if (loading) {
    return (
      <div className="rtd-reviews-loading">
        <div className="rtd-reviews-pulse" />
        <div
          className="rtd-reviews-pulse"
          style={{ width: "70%", marginTop: 8 }}
        />
      </div>
    );
  }

  return (
    <section className="rtd-reviews" aria-label="Đánh giá của khách">
      <div className="rtd-reviews-header">
        <h3 className="rtd-h3" style={{ marginBottom: 0 }}>
          Đánh giá của khách
        </h3>
        {total > 0 && (
          <span className="rtd-reviews-count">{total} đánh giá</span>
        )}
      </div>

      {total === 0 ? (
        <div className="rtd-reviews-empty">
          <svg
            width="36"
            height="36"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
          >
            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
          </svg>
          <p>Chưa có đánh giá nào cho hạng phòng này.</p>
        </div>
      ) : (
        <>
          <div className="rtd-reviews-summary">
            <div className="rtd-reviews-score">
              <div className="rtd-reviews-big">{avg.toFixed(1)}</div>
              <StarRating rating={avg} size={16} />
              <div className="rtd-reviews-label">Trên 5 sao</div>
            </div>
            <div className="rtd-reviews-bars">
              {[5, 4, 3, 2, 1].map((s) => (
                <RatingBar
                  key={s}
                  star={s}
                  count={breakdown[s]}
                  total={total}
                />
              ))}
            </div>
          </div>

          <div className="rtd-divider" style={{ margin: "20px 0" }} />

          <div className="rtd-review-list">
            {reviews.slice(0, visibleCount).map((r) => {
              const userName = r.user_id?.name || "Khách";
              const dateStr = r.created_at
                ? new Date(r.created_at).toLocaleDateString("vi-VN", {
                    day: "2-digit",
                    month: "2-digit",
                    year: "numeric",
                  })
                : "";
              const stayInfo = r.booking_id?.check_in_date
                ? (() => {
                    const ci = new Date(r.booking_id.check_in_date);
                    const co = new Date(r.booking_id.check_out_date);
                    const nights = Math.round((co - ci) / 86400000);
                    return `${nights} đêm · ${ci.toLocaleDateString("vi-VN", { month: "short", year: "numeric" })}`;
                  })()
                : null;

              return (
                <article key={r._id} className="rtd-review-card">
                  <div className="rtd-review-top">
                    <Avatar name={userName} />
                    <div className="rtd-review-meta">
                      <div className="rtd-review-name">{userName}</div>
                      {stayInfo && (
                        <div className="rtd-review-stay">{stayInfo}</div>
                      )}
                    </div>
                    <div className="rtd-review-right">
                      <StarRating rating={r.rating} size={13} />
                      {dateStr && (
                        <div className="rtd-review-date">{dateStr}</div>
                      )}
                    </div>
                  </div>

                  {r.comment && (
                    <p className="rtd-review-comment">{r.comment}</p>
                  )}

                  {/* Admin reply */}
                  {r.adminReply && (
                    <div className="rtd-admin-reply">
                      <div className="rtd-admin-reply-header">
                        <svg
                          width="14"
                          height="14"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <path d="M3 10h10a8 8 0 018 8v2M3 10l6 6M3 10l6-6" />
                        </svg>
                        <span>Phản hồi</span>
                      </div>
                      <p className="rtd-admin-reply-text">{r.adminReply}</p>
                    </div>
                  )}
                </article>
              );
            })}
          </div>

          {visibleCount < reviews.length && (
            <button
              type="button"
              className="rtd-reviews-more"
              onClick={() => setVisibleCount((v) => v + 4)}
            >
              Xem thêm đánh giá ({reviews.length - visibleCount} còn lại)
            </button>
          )}
        </>
      )}
    </section>
  );
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
        setErr(
          e.response?.data?.message || "Không tải được chi tiết hạng phòng.",
        );
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  const allImages = useMemo(() => {
    const base = [];
    if (roomType?.image) base.push(roomType.image);
    if (Array.isArray(roomType?.images)) base.push(...roomType.images);
    const normalized = base.map((img) => resolveImage(img)).filter(Boolean);
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
    const curId = String(roomType?._id || "");
    const idx = valid.findIndex((v) => v._id === curId);
    if (idx === -1) return valid.slice(0, 3);
    const start = Math.max(0, Math.min(valid.length - 3, idx - 1));
    return valid.slice(start, start + 3);
  }, [
    catalog,
    roomType?._id,
    roomType?.name,
    roomType?.price,
    roomType?.maxGuests,
    roomType?.max_guests,
    roomType?.area_sqm,
  ]);

  const mostPopularId = useMemo(() => {
    if (compareTiers.length === 0) return "";
    if (compareTiers.length >= 3) return compareTiers[1]._id;
    return String(roomType?._id || compareTiers[0]._id || "");
  }, [compareTiers, roomType?._id]);

  const complimentaryServices = useMemo(() => {
    const list = Array.isArray(roomType?.complimentary_services)
      ? roomType.complimentary_services
      : [];
    return list
      .map((s) => {
        const name = String(s?.name || "").trim();
        if (!name) return "";
        return name;
      })
      .filter(Boolean);
  }, [roomType?.complimentary_services]);

  const title = roomType?.name || "Chi tiết hạng phòng";
  const subtitle = roomType?.code
    ? String(roomType.code).replace(/_/g, " ")
    : "Nghỉ dưỡng hoàn hảo";
  const description =
    String(roomType?.description || "").trim() ||
    "Trải nghiệm lưu trú sang trọng với không gian ấm cúng, tiện nghi hiện đại và dịch vụ tận tâm.";

  if (loading) return <div className="rtd-shell rtd-loading">Đang tải…</div>;
  if (err) return <div className="rtd-shell rtd-error">{err}</div>;
  if (!roomType)
    return (
      <div className="rtd-shell rtd-error">Không tìm thấy hạng phòng.</div>
    );

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
              <strong>
                {roomType.maxGuests ?? roomType.max_guests ?? 2} khách
              </strong>
            </div>
            <div className="rtd-hero-stat">
              <span>Giá từ</span>
              <strong>
                {Number(roomType.price || 0).toLocaleString("vi-VN")} ₫ /đêm
              </strong>
            </div>
            <div className="rtd-hero-stat">
              <span>Tiền cọc</span>
              <strong>
                {Number(roomType.deposit_amount || 0).toLocaleString("vi-VN")} ₫
              </strong>
            </div>
          </div>
          <div className="rtd-hero-actions">
            <button
              type="button"
              className="rtd-btn rtd-btn-primary"
              onClick={() =>
                navigate(
                  `/book?room_type_id=${encodeURIComponent(String(roomType._id))}`,
                )
              }
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
          {/* ── Left: Images (unchanged) ── */}
          <div className="rtd-image-wrap">
            <div className="rtd-image">
              <img
                src={heroImage}
                alt={title}
                onError={(e) => (e.currentTarget.src = fallbackHero)}
              />
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
                      <img
                        src={img}
                        alt={`${title} ${idx + 1}`}
                        loading="lazy"
                      />
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

          {/* ── Right: Content (unchanged + reviews added at bottom) ── */}
          <div className="rtd-content">
            <h2 className="rtd-content-title">{title}</h2>
            <p className="rtd-desc">{description}</p>

            <div className="rtd-meta">
              <div className="rtd-meta-item">
                <div className="rtd-meta-k">Sức chứa</div>
                <div className="rtd-meta-v">
                  {roomType.maxGuests ?? roomType.max_guests ?? 2} người
                </div>
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
                  {Number(roomType.deposit_amount || 0).toLocaleString("vi-VN")}{" "}
                  ₫
                </div>
              </div>
            </div>

            <div className="rtd-primary-cta">
              <button
                type="button"
                className="rtd-btn rtd-btn-primary"
                onClick={() =>
                  navigate(
                    `/book?room_type_id=${encodeURIComponent(String(roomType._id))}`,
                  )
                }
              >
                Đặt phòng ngay
              </button>
              <Link className="rtd-btn rtd-btn-inline" to="/khach-san">
                Xem thêm hạng phòng
              </Link>
            </div>

            <div className="rtd-divider" />

            <div className="rtd-compare-head">
              <h3 className="rtd-h3" style={{ marginBottom: 0 }}>
                So sánh các hạng phòng
              </h3>
              <div className="rtd-compare-sub">
                Chọn nhanh hạng phù hợp theo nhu cầu.
              </div>
            </div>
            <div
              className="rtd-compare-grid"
              aria-label="Bảng so sánh hạng phòng"
            >
              {compareTiers.map((t) => {
                const isPopular = String(t._id) === String(mostPopularId);
                const isCurrent = String(t._id) === String(roomType._id);
                return (
                  <article
                    key={t._id}
                    className={`rtd-tier${isPopular ? " is-popular" : ""}${isCurrent ? " is-current" : ""}`}
                  >
                    <div className="rtd-tier-top">
                      <div className="rtd-tier-name">{t.name}</div>
                      {isPopular ? (
                        <div className="rtd-badge">Phổ biến nhất</div>
                      ) : null}
                    </div>
                    <div className="rtd-tier-price">
                      {Number(t.price || 0).toLocaleString("vi-VN")} ₫{" "}
                      <span> /đêm</span>
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
                        onClick={() =>
                          navigate(
                            `/hang-phong/${encodeURIComponent(String(t._id))}`,
                          )
                        }
                      >
                        Xem
                      </button>
                      <button
                        type="button"
                        className="rtd-tier-btn primary"
                        onClick={() =>
                          navigate(
                            `/book?room_type_id=${encodeURIComponent(String(t._id))}`,
                          )
                        }
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

        <div className="rtd-divider" />
        <ReviewsSection roomTypeId={String(roomType._id)} />
      </main>
    </div>
  );
}
