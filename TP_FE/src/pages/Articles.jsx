import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import "./style/Articles.css";
import { slugifyArticleTitle } from "./articleData";

export default function Articles() {
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        setError("");
        const res = await fetch("/api/posts");
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        const list = Array.isArray(data) ? data : [];
        setArticles(list);
      } catch {
        setArticles([]);
        setError("Không tải được danh sách bài viết.");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const effectiveArticles = useMemo(() => (Array.isArray(articles) ? articles : []), [articles]);
  const featured = useMemo(() => effectiveArticles[0] || null, [effectiveArticles]);
  const highlights = useMemo(() => effectiveArticles.slice(1, 3), [effectiveArticles]);
  const list = useMemo(() => effectiveArticles.slice(3), [effectiveArticles]);

  const formatDate = (value) => {
    const d = value ? new Date(value) : null;
    if (!d || Number.isNaN(d.getTime())) return "Mới cập nhật";
    return d.toLocaleDateString("vi-VN");
  };

  const excerptText = (value) => {
    const text = String(value || "").trim();
    if (!text) return "Nội dung đang cập nhật.";
    return text.slice(0, 170) + (text.length > 170 ? "..." : "");
  };

  const resolveImage = (value, fallback) => {
    const raw = String(value || "").trim();
    if (!raw) return fallback;
    if (raw.startsWith("http://") || raw.startsWith("https://")) return raw;
    if (raw.startsWith("//")) return `https:${raw}`;
    if (raw.startsWith("/")) return raw;
    return `/uploads/${raw}`;
  };

  if (loading) {
    return (
      <main className="articles-page">
        <section className="articles-list">
          <div className="articles-container">
            <p>Đang tải bài viết...</p>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="articles-page">
      <section className="articles-hero">
        <div className="articles-container">
          <p className="articles-eyebrow">Tạp chí khách sạn</p>
          <h1>Cẩm nang lưu trú & trải nghiệm du lịch</h1>
          <p className="articles-subtitle">
            Cập nhật các bài viết mới nhất về mẹo đặt phòng, kinh nghiệm nghỉ dưỡng
            và khám phá điểm đến giúp chuyến đi của bạn trọn vẹn hơn.
          </p>
        </div>
      </section>

      {error ? (
        <section className="articles-list">
          <div className="articles-container">
            <p>{error}</p>
          </div>
        </section>
      ) : null}

      {!featured ? (
        <section className="articles-list">
          <div className="articles-container">
            <p>Chưa có bài viết nào.</p>
          </div>
        </section>
      ) : (
        <>
      <section className="articles-featured">
        <div className="articles-container featured-grid">
          <article className="featured-main">
            <img
              src={resolveImage(
                featured.image,
                "https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?auto=format&fit=crop&w=1400&q=80",
              )}
              alt={featured.title}
              loading="lazy"
            />
            <div className="featured-overlay">
              <span>{featured.isPublished ? "Đã xuất bản" : "Bản nháp"}</span>
              <h2>{featured.title}</h2>
              <p>{excerptText(featured.content)}</p>
              <div className="featured-meta">{formatDate(featured.createdAt)}</div>
              <Link to={`/bai-viet/${slugifyArticleTitle(featured.title)}?id=${featured._id}`} className="featured-link">
                Đọc bài viết
              </Link>
            </div>
          </article>

          <div className="featured-side">
            {highlights.map((item) => (
              <article key={item._id} className="featured-side-card">
                <img
                  src={resolveImage(
                    item.image,
                    "https://images.unsplash.com/photo-1566665797739-1674de7a421a?auto=format&fit=crop&w=1400&q=80",
                  )}
                  alt={item.title}
                  loading="lazy"
                />
                <div className="featured-side-body">
                  <span>{item.isPublished ? "Đã xuất bản" : "Bản nháp"}</span>
                  <h3>{item.title}</h3>
                  <p>{formatDate(item.createdAt)}</p>
                  <Link to={`/bai-viet/${slugifyArticleTitle(item.title)}?id=${item._id}`} className="featured-mini-link">
                    Xem chi tiết
                  </Link>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="articles-list">
        <div className="articles-container">
          <div className="articles-head">
            <h2>Bài viết nổi bật</h2>
            <p>Chọn nhanh chủ đề bạn quan tâm để chuẩn bị cho kỳ nghỉ tiếp theo.</p>
          </div>
          <div className="articles-grid">
            {list.map((item) => (
              <article key={item._id} className="article-card">
                <img
                  src={resolveImage(
                    item.image,
                    "https://images.unsplash.com/photo-1466978913421-dad2ebd01d17?auto=format&fit=crop&w=1400&q=80",
                  )}
                  alt={item.title}
                  loading="lazy"
                />
                <div className="article-card-body">
                  <span>{item.isPublished ? "Đã xuất bản" : "Bản nháp"}</span>
                  <h3>{item.title}</h3>
                  <p>{excerptText(item.content)}</p>
                  <div className="article-card-footer">
                    <small>{formatDate(item.createdAt)}</small>
                    <Link to={`/bai-viet/${slugifyArticleTitle(item.title)}?id=${item._id}`}>Đọc tiếp</Link>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>
      </>
      )}

      <section className="articles-cta">
        <div className="articles-container cta-box">
          <div>
            <h2>Sẵn sàng cho chuyến đi tiếp theo?</h2>
            <p>
              Khám phá các hạng phòng và ưu đãi mới nhất để lên kế hoạch nghỉ dưỡng
              phù hợp với nhu cầu của bạn.
            </p>
          </div>
          <Link to="/khach-san" className="cta-button">
            Xem hạng phòng
          </Link>
        </div>
      </section>
    </main>
  );
}
