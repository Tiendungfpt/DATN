import { useEffect, useMemo, useState } from "react";
import { Link, Navigate, useParams, useSearchParams } from "react-router-dom";
import { slugifyArticleTitle } from "./articleData";
import "./style/Articles.css";

export default function ArticleDetail() {
  const resolveImage = (value, fallback) => {
    const raw = String(value || "").trim();
    if (!raw) return fallback;
    if (raw.startsWith("http://") || raw.startsWith("https://")) return raw;
    if (raw.startsWith("//")) return `https:${raw}`;
    if (raw.startsWith("/")) return raw;
    return `/uploads/${raw}`;
  };

  const { slug } = useParams();
  const [searchParams] = useSearchParams();
  const [items, setItems] = useState([]);
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
        setItems(Array.isArray(data) ? data : []);
      } catch {
        setItems([]);
        setError("Không tải được chi tiết bài viết.");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const articleId = String(searchParams.get("id") || "").trim();
  const effectiveItems = useMemo(() => (Array.isArray(items) ? items : []), [items]);
  const article = useMemo(() => {
    if (articleId) return effectiveItems.find((item) => String(item?._id) === articleId);
    return effectiveItems.find((item) => slugifyArticleTitle(item?.title) === slug);
  }, [effectiveItems, articleId, slug]);

  if (!article) {
    if (loading) {
      return (
        <main className="articles-page article-detail-page">
          <section className="article-detail-content-wrap">
            <div className="articles-container article-detail-content">Đang tải bài viết...</div>
          </section>
        </main>
      );
    }
    if (error) {
      return (
        <main className="articles-page article-detail-page">
          <section className="article-detail-content-wrap">
            <div className="articles-container article-detail-content">{error}</div>
          </section>
        </main>
      );
    }
    return <Navigate to="/bai-viet" replace />;
  }

  const relatedArticles = effectiveItems
    .filter((item) => String(item._id) !== String(article._id))
    .slice(0, 3);

  const paragraphs = String(article.content || "")
    .split(/\n+/)
    .map((x) => x.trim())
    .filter(Boolean);

  return (
    <main className="articles-page article-detail-page">
      <section className="article-detail-hero">
        <div className="articles-container">
          <Link to="/bai-viet" className="article-back-link">
            ← Quay lại trang bài viết
          </Link>
          <p className="articles-eyebrow">{article.isPublished ? "Đã xuất bản" : "Bản nháp"}</p>
          <h1>{article.title}</h1>
          <p className="articles-subtitle">
            {String(article.content || "").slice(0, 180)}
            {String(article.content || "").length > 180 ? "..." : ""}
          </p>
          <div className="article-detail-meta">
            {article.createdAt ? new Date(article.createdAt).toLocaleDateString("vi-VN") : "Mới cập nhật"}
          </div>
        </div>
      </section>

      <section className="article-detail-content-wrap">
        <div className="articles-container article-detail-content">
          <img
            src={resolveImage(
              article.image,
              "https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?auto=format&fit=crop&w=1400&q=80",
            )}
            alt={article.title}
            className="article-detail-image"
          />
          {(paragraphs.length ? paragraphs : ["Nội dung đang cập nhật."]).map((paragraph) => (
            <p key={paragraph}>{paragraph}</p>
          ))}
        </div>
      </section>

      <section className="articles-list article-related">
        <div className="articles-container">
          <div className="articles-head">
            <h2>Bài viết liên quan</h2>
          </div>
          <div className="articles-grid">
            {relatedArticles.map((item) => (
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
                  <p>{String(item.content || "").slice(0, 140)}...</p>
                  <div className="article-card-footer">
                    <small>
                      {item.createdAt ? new Date(item.createdAt).toLocaleDateString("vi-VN") : "Mới cập nhật"}
                    </small>
                    <Link to={`/bai-viet/${slugifyArticleTitle(item.title)}?id=${item._id}`}>Đọc tiếp</Link>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}

