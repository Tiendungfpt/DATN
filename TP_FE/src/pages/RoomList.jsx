import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import axios from "axios";
import {
  FEATURED_ROOM_SLOTS,
  normalizeRoomTypeName,
  roomMatchesFeaturedSlot,
} from "../constants/featuredRoomTypes";


function RoomsList() {
    const navigate = useNavigate();

    const [rooms, setRooms] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isAdmin, setIsAdmin] = useState(false);
    const [physicalCountByTypeKey, setPhysicalCountByTypeKey] = useState({});
    const [totalPhysicalFromApi, setTotalPhysicalFromApi] = useState(0);

    const [ratings, setRatings] = useState({});

    const placeholderImage = "https://images.unsplash.com/photo-1631049307264-da0ec9d70304?q=80&w=2070&auto=format&fit=crop";
useEffect(() => {
  const fetchData = async () => {
    try {
      const res = await axios.get("http://localhost:3000/api/rooms");
      const data = Array.isArray(res.data) ? res.data : [];

      const counts = {};
      FEATURED_ROOM_SLOTS.forEach((slot) => {
        const key = normalizeRoomTypeName(slot.name);
        counts[key] = data.filter((r) =>
          roomMatchesFeaturedSlot(r, slot),
        ).length;
      });

      const selected = [];
      FEATURED_ROOM_SLOTS.forEach((slot) => {
        const found = data.find((r) => roomMatchesFeaturedSlot(r, slot));
        if (found) selected.push(found);
      });

      setPhysicalCountByTypeKey(counts);
      setTotalPhysicalFromApi(data.length);
      setRooms(selected);

      const ratingData = {};

      await Promise.all(
        selected.map(async (room) => {
          try {
            const r = await axios.get(
              `http://localhost:3000/api/reviews/room/${room._id}/summary`
            );
            ratingData[room._id] = r.data;
          } catch {
            ratingData[room._id] = { avg: 0, total: 0 };
          }
        })
      );

      setRatings(ratingData);
    } catch {
      setRooms([]);
    } finally {
      setLoading(false);
    }
  };

  fetchData();
}, []);

    useEffect(() => {
        try {
            const user = JSON.parse(localStorage.getItem("user") || "null");
            setIsAdmin(user?.role === "admin");
        } catch {
            setIsAdmin(false);
        }
    }, []);

    

    if (loading) {
        return <div style={styles.loading}>Đang tải danh sách phòng...</div>;
    }

    return (
        <div style={styles.container}>
            {/* Header */}
            <div style={styles.header}>
                <h1 style={styles.title}>
                    Danh sách phòng
                </h1>
                <p style={styles.subtitle}>
                    {isAdmin
                      ? `Tổng ${totalPhysicalFromApi} phòng (API) · ${rooms.length} loại hiển thị`
                      : "Các loại phòng nổi bật — chọn loại phù hợp với bạn"}
                </p>
            </div>

            {/* Room Grid */}
            <div style={styles.grid}>
                {rooms.map((room) => (
                    <div key={room._id} style={styles.card}>
                        <div style={styles.imageContainer}>
                            <img
                                src={
                                    room.image?.startsWith("http")
                                        ? room.image
                                        : `http://localhost:3000/uploads/${room.image}`
                                }
                                alt={room.name}
                                style={styles.image}
                                onError={(e) => {
                                    e.target.onerror = null;
                                    e.target.src = placeholderImage;
                                }}
                            />
                            {isAdmin && (
                            <div style={{
                                ...styles.statusBadge,
                                backgroundColor: room.status === "available" ? "#10b981" : "#ef4444"
                            }}>
                                {room.status === "available" ? "Còn trống" : "Đã đặt"}
                            </div>
                            )}
                        </div>

                        <div style={styles.cardContent}>
                            <h3 style={styles.roomName}>{room.name}</h3>
                            {isAdmin && (
                              <p style={{ fontSize: "14px", color: "#64748b", marginBottom: "8px" }}>
                                Loại này:{" "}
                                <strong>
                                  {physicalCountByTypeKey[
                                    normalizeRoomTypeName(room.name)
                                  ] ?? 0}{" "}
                                  phòng
                                </strong>
                              </p>
                            )}
   <div style={{ marginBottom: "10px" }}>
  ⭐ {ratings[room._id]?.avg || 0} / 5
  <br />
  <small>
    ({ratings[room._id]?.total || 0} đánh giá)
  </small>
</div>                         
                            <p style={styles.capacity}>
                                🛏️ {room.capacity} người
                            </p>

                            <p style={styles.description}>
                                Không gian sạch sẽ, đầy đủ tiện nghi cho kỳ nghỉ của bạn.
                            </p>

                            <div style={styles.priceRow}>
                                <div>
                                    <span style={styles.price}>
                                        {room.price?.toLocaleString("vi-VN")} ₫
                                    </span>
                                    <span style={styles.perNight}> / đêm</span>
                                </div>
                            </div>

                            {!isAdmin && (
                                <button
                                    style={styles.button}
                                    onClick={() => navigate(`/booking/${room._id}`)}
                                >
                                    Đặt phòng
                                </button>
                            )}
                        </div>
                    </div>
                ))}
            </div>

            {rooms.length === 0 && (
                <p style={styles.noRoom}>Không có phòng nào khả dụng tại thời điểm này.</p>
            )}
        </div>
    );
}

const styles = {
    container: {
        fontFamily: "'Segoe UI', system-ui, sans-serif",
        backgroundColor: "#f8fafc",
        minHeight: "100vh",
        padding: "40px 5%",
    },

    loading: {
        textAlign: "center",
        marginTop: "120px",
        fontSize: "22px",
        color: "#64748b",
    },

    header: {
        textAlign: "center",
        marginBottom: "50px",
    },

    title: {
        fontSize: "36px",
        fontWeight: "700",
        color: "#1e2937",
        marginBottom: "8px",
    },

    subtitle: {
        fontSize: "18px",
        color: "#64748b",
    },

    grid: {
        display: "grid",
        gridTemplateColumns: "repeat(auto-fill, minmax(380px, 1fr))",
        gap: "30px",
        maxWidth: "1400px",
        margin: "0 auto",
    },

    card: {
        background: "white",
        borderRadius: "16px",
        overflow: "hidden",
        boxShadow: "0 10px 30px rgba(0,0,0,0.1)",
        transition: "all 0.3s ease",
    },

    imageContainer: {
        position: "relative",
        height: "240px",
    },

    image: {
        width: "100%",
        height: "100%",
        objectFit: "cover",
        transition: "0.3s",
    },

    statusBadge: {
        position: "absolute",
        top: "15px",
        right: "15px",
        padding: "6px 14px",
        borderRadius: "30px",
        color: "white",
        fontSize: "14px",
        fontWeight: "600",
    },

    cardContent: {
        padding: "24px",
    },

    roomName: {
        fontSize: "22px",
        fontWeight: "700",
        margin: "0 0 8px 0",
        color: "#1e2937",
    },

    capacity: {
        color: "#64748b",
        fontSize: "15.5px",
        marginBottom: "12px",
    },

    description: {
        color: "#475569",
        fontSize: "15px",
        lineHeight: "1.6",
        marginBottom: "20px",
        minHeight: "70px",
    },

    priceRow: {
        marginBottom: "20px",
    },

    price: {
        fontSize: "26px",
        fontWeight: "700",
        color: "#1e2937",
    },

    perNight: {
        color: "#64748b",
        fontSize: "16px",
    },

    button: {
        width: "100%",
        padding: "14px",
        background: "linear-gradient(135deg, #f59e0b, #ea580c)",
        color: "white",
        border: "none",
        borderRadius: "10px",
        fontSize: "16px",
        fontWeight: "700",
        cursor: "pointer",
        transition: "all 0.3s",
    },

    noRoom: {
        textAlign: "center",
        fontSize: "18px",
        color: "#64748b",
        marginTop: "50px",
    },
};

export default RoomsList;