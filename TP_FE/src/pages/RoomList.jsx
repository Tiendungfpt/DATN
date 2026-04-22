import { useEffect, useState } from "react";
import axios from "axios";
import {
  FEATURED_ROOM_SLOTS,
  normalizeRoomTypeName,
  roomMatchesFeaturedSlot,
} from "../constants/featuredRoomTypes";
import RoomTypeCardStructured from "../components/RoomTypeCardStructured";
import {
  fetchRoomTypeAvailability,
  fetchRoomTypeCatalog,
} from "../services/availabilityApi";


function RoomsList() {
    const [rooms, setRooms] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isAdmin, setIsAdmin] = useState(false);
    const [physicalCountByTypeKey, setPhysicalCountByTypeKey] = useState({});
    const [totalPhysicalFromApi, setTotalPhysicalFromApi] = useState(0);

    const [ratings, setRatings] = useState({});
    const [availabilityByTypeId, setAvailabilityByTypeId] = useState({});
    const [availabilityByName, setAvailabilityByName] = useState({});
    const [descriptionByTypeId, setDescriptionByTypeId] = useState({});
    const [descriptionByName, setDescriptionByName] = useState({});

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
              `http://localhost:3000/api/reviews/room/${room._id}/summary?aggregateByType=1`
            );
            ratingData[room._id] = r.data;
          } catch {
            ratingData[room._id] = { avg: 0, total: 0 };
          }
        })
      );

      setRatings(ratingData);
      try {
        const [availability, roomTypes] = await Promise.all([
          fetchRoomTypeAvailability(),
          fetchRoomTypeCatalog(),
        ]);
        const byId = {};
        const byName = {};
        availability.forEach((row) => {
          byId[String(row.room_type_id)] = Number(row.available_count) || 0;
          byName[normalizeRoomTypeName(row.name)] = Number(row.available_count) || 0;
        });
        const descById = {};
        const descByName = {};
        roomTypes.forEach((rt) => {
          const desc = String(rt.description || "").trim();
          descById[String(rt._id)] = desc;
          descByName[normalizeRoomTypeName(rt.name)] = desc;
          if (rt.code) descByName[normalizeRoomTypeName(rt.code)] = desc;
        });
        setAvailabilityByTypeId(byId);
        setAvailabilityByName(byName);
        setDescriptionByTypeId(descById);
        setDescriptionByName(descByName);
      } catch {
        setAvailabilityByTypeId({});
        setAvailabilityByName({});
        setDescriptionByTypeId({});
        setDescriptionByName({});
      }
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
                        <RoomTypeCardStructured
                          room={room}
                          imageSrc={
                            room.image?.startsWith("http")
                              ? room.image
                              : `http://localhost:3000/uploads/${room.image}`
                          }
                          ratingAvg={ratings[room._id]?.avg || 0}
                          ratingTotal={ratings[room._id]?.total || 0}
                          availableCount={
                            room.roomType
                              ? (availabilityByTypeId[String(room.roomType)] ?? 0)
                              : (availabilityByName[normalizeRoomTypeName(room.name)] ?? 0)
                          }
                          description={
                            room.roomType
                              ? descriptionByTypeId[String(room.roomType)] || "Mô tả đang cập nhật."
                              : descriptionByName[normalizeRoomTypeName(room.name)] ||
                                "Mô tả đang cập nhật."
                          }
                          showBookButton={!isAdmin}
                        />
                        {isAdmin && (
                          <p style={{ fontSize: "14px", color: "#64748b", marginTop: "8px" }}>
                            Loại này:{" "}
                            <strong>
                              {physicalCountByTypeKey[
                                normalizeRoomTypeName(room.name)
                              ] ?? 0}{" "}
                              phòng
                            </strong>
                          </p>
                        )}
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
        marginBottom: "12px",
        minHeight: "70px",
    },
    availableCount: {
        marginBottom: "16px",
        color: "#374151",
        fontSize: "14px",
        background: "#fff7ed",
        border: "1px solid #fdba74",
        borderRadius: "8px",
        padding: "6px 10px",
        display: "inline-block",
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