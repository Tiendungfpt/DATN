import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import axios from "axios";
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
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  useEffect(() => {
    if (!id) return;
    (async () => {
      try {
        setLoading(true);
        setErr("");
        const res = await axios.get(`/api/room-types/${id}`);
        setRoomType(res.data || null);
      } catch (e) {
        setRoomType(null);
        setErr(e.response?.data?.message || "Không tải được chi tiết hạng phòng.");
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  const heroImage = useMemo(() => resolveImage(roomType?.image), [roomType?.image]);

  const amenities = useMemo(
    () => [
      "Tất cả các phòng không hút thuốc",
      "Phòng khách",
      "Bồn tắm, buồng tắm đứng, vòi sen và thiết bị vệ sinh thông minh",
      "Máy sấy tóc",
      "Áo choàng tắm",
      "Dép đi trong nhà",
      "Tủ quần áo",
      "TV & kênh truyền hình cáp",
      "Điện thoại IDD",
      "WiFi miễn phí",
      "Bàn làm việc",
      "Minibar",
      "Trà và cà phê",
      "Ấm siêu tốc",
      "Két an toàn",
      "2 chai nước khoáng hằng ngày",
    ],
    [],
  );

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
          <h1 className="rtd-title">{title}</h1>
          <div className="rtd-subtitle">{subtitle}</div>
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
          <div className="rtd-image">
            <img src={heroImage} alt={title} onError={(e) => (e.currentTarget.src = fallbackHero)} />
          </div>

          <div className="rtd-content">
            <h2 className="rtd-content-title">{title}</h2>
            <p className="rtd-desc">{description}</p>

            <div className="rtd-meta">
              <div className="rtd-meta-item">
                <div className="rtd-meta-k">Sức chứa</div>
                <div className="rtd-meta-v">{roomType.maxGuests || 2} người</div>
              </div>
              <div className="rtd-meta-item">
                <div className="rtd-meta-k">Giá</div>
                <div className="rtd-meta-v">
                  {Number(roomType.price || 0).toLocaleString("vi-VN")} ₫/đêm
                </div>
              </div>
              <div className="rtd-meta-item">
                <div className="rtd-meta-k">Tiền cọc</div>
                <div className="rtd-meta-v">
                  {Number(roomType.deposit_amount || 0).toLocaleString("vi-VN")} ₫
                </div>
              </div>
            </div>

            <div className="rtd-divider" />

            <h3 className="rtd-h3">Tiện nghi</h3>
            <ul className="rtd-amenities">
              {amenities.map((a) => (
                <li key={a}>{a}</li>
              ))}
            </ul>
          </div>
        </div>
      </main>
    </div>
  );
}

