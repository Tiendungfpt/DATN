import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { fetchRoomTypeCatalog } from "../services/availabilityApi";
import "./style/Accommodations.css";

const fallbackImage =
  "https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=1200&q=80";

function resolveImage(img) {
  const raw = String(img || "").trim();
  if (!raw) return fallbackImage;
  if (raw.startsWith("http://") || raw.startsWith("https://")) return raw;
  if (raw.startsWith("//")) return `https:${raw}`;
  return `/uploads/${raw}`;
}

export default function Accommodations() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        setError("");
        const list = await fetchRoomTypeCatalog();
        setItems(Array.isArray(list) ? list : []);
      } catch (e) {
        setItems([]);
        setError(e?.message || "Không tải được danh sách hạng phòng.");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <main className="acc-page">
      <section className="acc-hero">
        <div className="acc-hero-inner hh-container">
          <h1>Các hạng phòng của chúng tôi</h1>
          <p>
            Phòng nghỉ rộng rãi và tinh tế, được trang bị đầy đủ tiện nghi để mang lại sự thoải mái
            và thư giãn tuyệt vời.
          </p>
        </div>
      </section>

      <section className="acc-list hh-container">
        {loading ? <p className="acc-muted">Đang tải…</p> : null}
        {error ? <p className="acc-error">{error}</p> : null}

        <div className="acc-grid">
          {items.map((rt) => (
            <article key={rt._id} className="acc-card">
              <img
                className="acc-image"
                src={resolveImage(rt.image)}
                alt={rt.name}
                onError={(e) => {
                  e.currentTarget.onerror = null;
                  e.currentTarget.src = fallbackImage;
                }}
              />
              <div className="acc-body">
                <h2 className="acc-title">{rt.name}</h2>
                <div className="acc-meta">
                  <span>{rt.maxGuests ?? 2} người lớn</span>
                </div>
                <p className="acc-desc">{String(rt.description || "").trim() || "Mô tả đang cập nhật."}</p>
                <div className="acc-actions">
                  <Link className="acc-link" to={`/hang-phong/${rt._id}`}>
                    Xem chi tiết
                  </Link>
                  <Link className="hh-btn-gold" to={`/book?room_type_id=${rt._id}`}>
                    Đặt phòng
                  </Link>
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}

