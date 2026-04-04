import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { useEffect, useState } from "react";
import axios from "axios";

function RoomDetail() {
    const { id } = useParams();
    console.log("Room ID:", id);
    const [reviews, setReviews] = useState([]);
    const [summary, setSummary] = useState({ avg: 0, total: 0 });

   useEffect(() => {
    if (!id) return;

    axios.get(`http://localhost:3000/api/reviews/room/${id}`)
        .then(res => {
            setReviews(res.data);
            console.log("reviews API:", res.data); // 👈 thêm ở đây
        })
        .catch(err => console.log(err));

    axios.get(`http://localhost:3000/api/reviews/room/${id}/summary`)
        .then(res => setSummary(res.data))
        .catch(err => console.log(err));

}, [id]);
    
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();

    const [room, setRoom] = useState(null);
    const [loading, setLoading] = useState(true);
    const [isAdmin, setIsAdmin] = useState(false);

    const placeholderImage = "https://images.unsplash.com/photo-1631049307264-da0ec9d70304?q=80&w=2070&auto=format&fit=crop";

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
                    src={
                        room.image?.startsWith("http")
                            ? room.image
                            : `http://localhost:3000/uploads/${room.image}`
                    }
                    alt={room.name}
                    style={styles.heroImage}
                    onError={(e) => {
                        e.target.onerror = null;
                        e.target.src = placeholderImage;
                    }}
                />
                <div style={styles.heroOverlay}>
                    <h1 style={styles.roomName}>{room.name}</h1>
                </div>
            </div>

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
                            {["Điều hòa", "WiFi tốc độ cao", "TV màn hình phẳng", "Phòng tắm riêng", 
                              "Minibar", "Bàn làm việc", "Két sắt", "Dép & Áo choàng tắm"].map((item, i) => (
                                <div key={i} style={styles.amenity}>✔ {item}</div>
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
                                onClick={() => navigate(`/booking/${room._id}`)}
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