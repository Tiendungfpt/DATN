import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import axios from "axios";

const fallbackImage =
  "https://images.unsplash.com/photo-1631049307264-da0ec9d70304?q=80&w=2070&auto=format&fit=crop";

function resolveImage(img) {
  const raw = String(img || "").trim();
  if (!raw) return fallbackImage;
  if (raw.startsWith("http://") || raw.startsWith("https://")) return raw;
  if (raw.startsWith("//")) return `https:${raw}`;
  if (raw.startsWith("/")) return raw.startsWith("/uploads/") ? `http://localhost:3000${raw}` : raw;
  return `http://localhost:3000/uploads/${raw}`;
}

function RoomDetail() {
    const { id } = useParams();
    console.log("Room ID:", id);
    const [reviews, setReviews] = useState([]);
    const [summary, setSummary] = useState({ avg: 0, total: 0 });

   useEffect(() => {
    if (!id) return;

    axios.get(`http://localhost:3000/api/reviews/room/${id}?aggregateByType=1`)
        .then(res => {
            setReviews(res.data);
            console.log("reviews API:", res.data); // 👈 thêm ở đây
        })
        .catch(err => console.log(err));

    axios.get(`http://localhost:3000/api/reviews/room/${id}/summary?aggregateByType=1`)
        .then(res => setSummary(res.data))
        .catch(err => console.log(err));

}, [id]);
    
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();

    const [room, setRoom] = useState(null);
    const [loading, setLoading] = useState(true);
    const [isAdmin, setIsAdmin] = useState(false);
    const [lightboxOpen, setLightboxOpen] = useState(false);
    const [activeIdx, setActiveIdx] = useState(0);

    const gallery = useMemo(() => {
        const base = room?.image ? [room.image] : [];
        const arr = Array.isArray(room?.images) ? room.images : [];
        const merged = [...base, ...arr].map(resolveImage);
        return Array.from(new Set(merged)).slice(0, 12);
    }, [room?.image, room?.images]);

    const complimentaryServices = useMemo(() => {
        const roomLevel = Array.isArray(room?.complimentary_services) ? room.complimentary_services : [];
        const typeLevel = Array.isArray(room?.roomType?.complimentary_services)
            ? room.roomType.complimentary_services
            : [];
        const list = roomLevel.length > 0 ? roomLevel : typeLevel;
        return list
            .map((s) => {
                const name = String(s?.name || "").trim();
                if (!name) return "";
                return name;
            })
            .filter(Boolean);
    }, [room?.complimentary_services, room?.roomType?.complimentary_services]);

    const extraServices = useMemo(() => {
        const roomLevel = Array.isArray(room?.extra_services) ? room.extra_services : [];
        const typeLevel = Array.isArray(room?.roomType?.extra_services)
            ? room.roomType.extra_services
            : [];
        const list = roomLevel.length > 0 ? roomLevel : typeLevel;
        return list
            .map((s) => {
                const name = String(s?.name || "").trim();
                if (!name) return "";
                const price = Number(s?.defaultPrice || 0);
                const unit = String(s?.unit || "").trim();
                const suffix = price > 0 ? ` (${price.toLocaleString("vi-VN")} ₫${unit ? `/${unit}` : ""})` : "";
                return `${name}${suffix}`;
            })
            .filter(Boolean);
    }, [room?.extra_services, room?.roomType?.extra_services]);

    const openLightbox = (idx) => {
        const safe = Math.max(0, Math.min(Number(idx) || 0, Math.max(0, gallery.length - 1)));
        setActiveIdx(safe);
        setLightboxOpen(true);
    };

    const closeLightbox = () => setLightboxOpen(false);

    const next = () => {
        if (gallery.length <= 1) return;
        setActiveIdx((i) => (i + 1) % gallery.length);
    };

    const prev = () => {
        if (gallery.length <= 1) return;
        setActiveIdx((i) => (i - 1 + gallery.length) % gallery.length);
    };

    useEffect(() => {
        try {
            const user = JSON.parse(localStorage.getItem("user") || "null");
            setIsAdmin(user?.role === "admin");
        } catch {
            setIsAdmin(false);
        }
    }, []);

    useEffect(() => {
        axios
            .get(`http://localhost:3000/api/rooms/${id}`)
            .then((res) => {
                setRoom(res.data);
            })
            .catch((err) => {
                console.error("Lỗi load phòng:", err);
            })
            .finally(() => {
                setLoading(false);
            });
    }, [id]);

    if (loading) return <div style={styles.loading}>Đang tải thông tin phòng...</div>;
    if (!room) return <div style={styles.notFound}>Không tìm thấy phòng</div>;

    return (
        <div style={styles.container}>
          
            {/* Hero Section */}
            <div style={styles.hero}>
                <img
                    src={gallery[0] || resolveImage(room.image)}
                    alt={room.name}
                    style={styles.heroImage}
                    onClick={() => openLightbox(0)}
                    onError={(e) => {
                        e.target.onerror = null;
                        e.target.src = fallbackImage;
                    }}
                />
                <div style={styles.heroOverlay}>
                    <h1 style={styles.roomName}>{room.name}</h1>
                </div>
            </div>

            {gallery.length > 1 ? (
                <div style={styles.thumbRow} aria-label="Bộ sưu tập ảnh phòng">
                    {gallery.slice(0, 8).map((src, idx) => (
                        <button
                            key={src}
                            type="button"
                            style={{
                                ...styles.thumbBtn,
                                outline: idx === activeIdx && lightboxOpen ? "2px solid #3b82f6" : "none",
                            }}
                            onClick={() => openLightbox(idx)}
                            title="Xem ảnh lớn"
                        >
                            <img src={src} alt="thumb" style={styles.thumbImg} />
                        </button>
                    ))}
                    {gallery.length > 8 ? (
                        <div style={styles.moreThumb}>+{gallery.length - 8}</div>
                    ) : null}
                </div>
            ) : null}

            <div style={styles.content}>
                {/* Left - Thông tin phòng */}
                <div style={styles.left}>
                    <div style={styles.infoCard}>
                        <p style={styles.capacity}>
                            🛏️ {room.capacity} người • {room.size || "35m²"}
                        </p>

                        <p style={styles.description}>{room.description}</p>

                        <h3 style={styles.sectionTitle}>Tiện ích phòng</h3>
                        <div style={styles.amenitiesGrid}>
                            {(complimentaryServices.length > 0
                              ? complimentaryServices
                              : ["Điều hòa", "WiFi tốc độ cao", "TV màn hình phẳng", "Phòng tắm riêng",
                                "Minibar", "Bàn làm việc", "Két sắt", "Dép & Áo choàng tắm"]).map((item, i) => (
                                <div key={i} style={styles.amenity}>✔ {item}</div>
                            ))}
                        </div>
                        <h3 style={styles.sectionTitle}>Dịch vụ phát sinh</h3>
                        <div style={styles.amenitiesGrid}>
                            {(extraServices.length > 0
                              ? extraServices
                              : ["Không có dịch vụ phát sinh được cấu hình"]).map((item, i) => (
                                <div key={`extra_${i}`} style={styles.amenity}>• {item}</div>
                            ))}
                        </div>
<h3 style={styles.sectionTitle}>⭐ Đánh giá phòng</h3>

<p style={{ fontSize: "18px", marginBottom: "10px" }}>
  ⭐ <strong>{summary.avg}</strong> / 5 ({summary.total} đánh giá)
</p>

{reviews.length === 0 && (
  <p style={{ color: "#64748b" }}>Chưa có đánh giá</p>
)}

{/* 👇 LIST REVIEW ĐẶT Ở ĐÂY */}
{reviews.map((r) => (
  <div
    key={r._id}
    style={{
      borderBottom: "1px solid #eee",
      padding: "10px 0"
    }}
  >
    <strong>{r.user_id?.name}</strong>
    <p style={{ margin: 0 }}>⭐ {r.rating}</p>
    <p style={{ color: "#475569" }}>{r.comment}</p>
    {r.adminReply ? (
      <div
        style={{
          marginTop: "6px",
          padding: "8px 10px",
          background: "#eff6ff",
          borderLeft: "3px solid #3b82f6",
          borderRadius: "6px",
        }}
      >
        <strong style={{ color: "#1d4ed8" }}>Phản hồi từ khách sạn:</strong>
        <p style={{ margin: "4px 0 0", color: "#1e3a8a" }}>{r.adminReply}</p>
      </div>
    ) : null}
  </div>
))}
                    </div>
                </div>

                <div style={styles.right}>
                    <div style={styles.bookingCard}>
                        <p style={styles.freeCancel}>✔ Hủy miễn phí trước 48 giờ</p>

                        <div style={styles.priceSection}>
                            <span style={styles.oldPrice}>
                                {(room.price * 1.2)?.toLocaleString("vi-VN")} ₫
                            </span>
                            <div style={styles.newPrice}>
                                {room.price?.toLocaleString("vi-VN")} ₫
                                <span style={styles.perNight}> / đêm</span>
                            </div>
                        </div>

                        {!isAdmin && (
                            <button 
                                style={styles.bookButton}
                                onClick={() => {
                                  const token = localStorage.getItem("token");
                                  const userStr = localStorage.getItem("user");
                                  let currentUser = null;
                                  if (userStr) {
                                    try {
                                      currentUser = JSON.parse(userStr);
                                    } catch {
                                      currentUser = null;
                                    }
                                  }
                                  if (!token || !currentUser?._id) {
                                    alert("Vui lòng đăng nhập để đặt phòng.");
                                    navigate("/login", { state: { from: `/booking/${encodeURIComponent(id)}` } });
                                    return;
                                  }
                                  if (currentUser?.role === "admin") {
                                    alert("Tài khoản admin không được phép đặt phòng.");
                                    return;
                                  }
                                  const roomTypeId = String(room?.roomType?._id ?? room?.roomType ?? "");
                                  if (roomTypeId && roomTypeId !== "undefined" && roomTypeId !== "null") {
                                    navigate(`/book?room_type_id=${encodeURIComponent(roomTypeId)}`);
                                  } else {
                                    navigate("/book");
                                  }
                                }}
                            >
                                Đặt phòng ngay
                            </button>
                        )}

                        <p style={styles.guarantee}>Đảm bảo giá tốt nhất</p>
                        {/* 👇 NÚT QUAY LẠI */}
<button
    style={styles.backButton}
    onClick={() => navigate(-1)}
>
    ← Quay lại
</button>
                    </div>
                </div>
            </div>

            {lightboxOpen ? (
                <div
                    style={styles.lightboxOverlay}
                    role="dialog"
                    aria-modal="true"
                    onClick={(e) => {
                        if (e.target === e.currentTarget) closeLightbox();
                    }}
                >
                    <button type="button" style={styles.lightboxClose} onClick={closeLightbox} aria-label="Đóng">
                        ×
                    </button>

                    <button
                        type="button"
                        style={{ ...styles.lightboxNav, left: 14 }}
                        onClick={prev}
                        disabled={gallery.length <= 1}
                        aria-label="Ảnh trước"
                    >
                        ‹
                    </button>

                    <img
                        src={gallery[activeIdx] || gallery[0] || fallbackImage}
                        alt="Ảnh phòng"
                        style={styles.lightboxImage}
                        onClick={(e) => e.stopPropagation()}
                    />

                    <button
                        type="button"
                        style={{ ...styles.lightboxNav, right: 14 }}
                        onClick={next}
                        disabled={gallery.length <= 1}
                        aria-label="Ảnh sau"
                    >
                        ›
                    </button>

                    <div style={styles.lightboxMeta}>
                        {activeIdx + 1} / {gallery.length}
                    </div>
                </div>
            ) : null}
        </div>
    );
}

const styles = {
    backButton: {
    width: "100%",
    padding: "12px",
    background: "#e2e8f0",
    color: "#1e2937",
    border: "none",
    borderRadius: "10px",
    fontSize: "15px",
    fontWeight: "600",
    cursor: "pointer",
    marginTop: "10px",
    transition: "0.2s"
},
    container: {
        fontFamily: "'Segoe UI', system-ui, sans-serif",
        backgroundColor: "#f8fafc",
        minHeight: "100vh",
    },

    loading: {
        textAlign: "center",
        marginTop: "100px",
        fontSize: "20px",
        color: "#64748b",
    },

    notFound: {
        textAlign: "center",
        marginTop: "100px",
        fontSize: "20px",
        color: "red",
    },

    hero: {
        position: "relative",
        height: "520px",
        overflow: "hidden",
    },

    heroImage: {
        width: "100%",
        height: "100%",
        objectFit: "cover",
        transition: "0.3s",
        cursor: "zoom-in",
    },

    heroOverlay: {
        position: "absolute",
        bottom: 0,
        left: 0,
        right: 0,
        background: "linear-gradient(transparent, rgba(0,0,0,0.8))",
        padding: "50px 8%",
        color: "white",
    },

    roomName: {
        fontSize: "42px",
        fontWeight: "700",
        margin: 0,
        textShadow: "0 3px 10px rgba(0,0,0,0.6)",
    },

    content: {
        maxWidth: "1200px",
        margin: "-60px auto 0",
        padding: "0 20px",
        display: "grid",
        gridTemplateColumns: "2fr 1fr",
        gap: "40px",
        position: "relative",
    },

    left: { marginTop: "20px" },
    right: { marginTop: "20px" },

    thumbRow: {
        maxWidth: "1200px",
        margin: "14px auto 0",
        padding: "0 20px",
        display: "flex",
        gap: "10px",
        alignItems: "center",
        overflowX: "auto",
    },

    thumbBtn: {
        border: "none",
        padding: 0,
        background: "transparent",
        cursor: "pointer",
        borderRadius: "10px",
        overflow: "hidden",
        flex: "0 0 auto",
        boxShadow: "0 8px 22px rgba(15, 23, 42, 0.10)",
    },

    thumbImg: {
        width: "120px",
        height: "78px",
        objectFit: "cover",
        display: "block",
    },

    moreThumb: {
        flex: "0 0 auto",
        minWidth: "78px",
        height: "78px",
        borderRadius: "10px",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#0f172a",
        color: "white",
        fontWeight: 800,
        boxShadow: "0 8px 22px rgba(15, 23, 42, 0.10)",
    },

    lightboxOverlay: {
        position: "fixed",
        inset: 0,
        background: "rgba(2,6,23,0.85)",
        zIndex: 9999,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "28px",
    },

    lightboxImage: {
        maxWidth: "min(1100px, 92vw)",
        maxHeight: "82vh",
        objectFit: "contain",
        borderRadius: "14px",
        boxShadow: "0 20px 80px rgba(0,0,0,0.45)",
        background: "rgba(255,255,255,0.06)",
    },

    lightboxClose: {
        position: "absolute",
        top: 14,
        right: 16,
        width: 42,
        height: 42,
        borderRadius: 999,
        border: "1px solid rgba(255,255,255,0.18)",
        background: "rgba(15,23,42,0.55)",
        color: "white",
        fontSize: 26,
        cursor: "pointer",
    },

    lightboxNav: {
        position: "absolute",
        top: "50%",
        transform: "translateY(-50%)",
        width: 46,
        height: 46,
        borderRadius: 999,
        border: "1px solid rgba(255,255,255,0.18)",
        background: "rgba(15,23,42,0.55)",
        color: "white",
        fontSize: 30,
        cursor: "pointer",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
    },

    lightboxMeta: {
        position: "absolute",
        bottom: 18,
        left: "50%",
        transform: "translateX(-50%)",
        padding: "8px 12px",
        borderRadius: 999,
        background: "rgba(15,23,42,0.55)",
        border: "1px solid rgba(255,255,255,0.18)",
        color: "white",
        fontWeight: 700,
        fontSize: 13,
    },

    infoCard: {
        background: "white",
        borderRadius: "16px",
        padding: "40px",
        boxShadow: "0 10px 30px rgba(0,0,0,0.1)",
    },

    capacity: {
        fontSize: "18px",
        color: "#64748b",
        marginBottom: "20px",
    },

    description: {
        fontSize: "17px",
        lineHeight: "1.75",
        color: "#334155",
        marginBottom: "30px",
    },

    sectionTitle: {
        fontSize: "24px",
        marginBottom: "18px",
        color: "#1e2937",
    },

    amenitiesGrid: {
        display: "grid",
        gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
        gap: "12px",
    },

    amenity: {
        background: "#f1f5f9",
        padding: "12px 16px",
        borderRadius: "8px",
        fontSize: "15.5px",
        color: "#475569",
    },

    bookingCard: {
        background: "white",
        borderRadius: "16px",
        padding: "35px",
        boxShadow: "0 15px 35px rgba(0,0,0,0.12)",
        position: "sticky",
        top: "100px",
    },

    freeCancel: {
        color: "#10b981",
        fontWeight: "600",
        marginBottom: "20px",
    },

    priceSection: {
        marginBottom: "25px",
    },

    oldPrice: {
        textDecoration: "line-through",
        color: "#94a3b8",
        fontSize: "18px",
    },

    newPrice: {
        fontSize: "38px",
        fontWeight: "700",
        color: "#1e2937",
        margin: "8px 0",
    },

    perNight: {
        fontSize: "18px",
        color: "#64748b",
        fontWeight: "normal",
    },

    bookButton: {
        width: "100%",
        padding: "18px",
        background: "linear-gradient(135deg, #f59e0b, #ea580c)",
        color: "white",
        border: "none",
        borderRadius: "12px",
        fontSize: "18px",
        fontWeight: "700",
        cursor: "pointer",
        marginBottom: "15px",
        boxShadow: "0 8px 25px rgba(245, 158, 11, 0.35)",
        transition: "0.3s",
    },

    guarantee: {
        textAlign: "center",
        color: "#64748b",
        fontSize: "14px",
    },
};

export default RoomDetail;