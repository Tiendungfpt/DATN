import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import SearchBar from "../components/SearchBar";
import RoomTypeCardStructured from "../components/RoomTypeCardStructured";
import { normalizeRoomTypeName } from "../constants/featuredRoomTypes";
import {
  fetchRoomTypeAvailability,
  fetchRoomTypeCatalog,
  normalizeTypeName,
} from "../services/availabilityApi";
import "./style/Home.css";
export default function Home() {
  const fallbackRoomImage =
    "https://images.unsplash.com/photo-1631049307264-da0ec9d70304?q=80&w=2070&auto=format&fit=crop";

  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [ratings, setRatings] = useState({});
  const [availabilityByTypeId, setAvailabilityByTypeId] = useState({});
  const [availabilityByName, setAvailabilityByName] = useState({});
  const [descriptionByTypeId, setDescriptionByTypeId] = useState({});
  const [descriptionByName, setDescriptionByName] = useState({});
  useEffect(() => {
    const list = Array.isArray(rooms) ? rooms : [];
    const fetchRatings = async () => {
      const ratingData = {};
      await Promise.all(
        list.map(async (room) => {
          const rid = room?._id;
          if (!rid) return;
          try {
            const res = await fetch(
              `/api/reviews/room/${rid}/summary?aggregateByType=1`,
            );
            const data = await res.json();
            ratingData[rid] = data;
          } catch {
            ratingData[rid] = { avg: 0, total: 0 };
          }
        }),
      );
      setRatings(ratingData);
    };
    if (list.length > 0) {
      fetchRatings();
    }
  }, [rooms]);

  useEffect(() => {
    try {
      const user = JSON.parse(localStorage.getItem("user") || "null");
      setIsAdmin(user?.role === "admin");
    } catch {
      setIsAdmin(false);
    }
  }, []);

  useEffect(() => {
    const fetchRooms = async () => {
      try {
        // Show representative room per type from ALL rooms (not limited to 5 featured).
        const res = await fetch("/api/rooms");

        if (!res.ok) throw new Error(`Lỗi server: ${res.status}`);

        const data = await res.json();
        let list = Array.isArray(data) ? data : data?.data || data?.result || [];
        if (!Array.isArray(list)) list = [];

        const repByType = new Map();
        for (const r of list) {
          const typeKey = String(r.roomType || r.room_type || r.name || "");
          const norm = normalizeRoomTypeName(typeKey);
          if (!repByType.has(norm)) repByType.set(norm, r);
        }
        setRooms([...repByType.values()]);
      } catch (err) {
        console.error("Lỗi khi lấy dữ liệu:", err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchRooms();
  }, []);

  useEffect(() => {
    const fetchAvailability = async () => {
      try {
        const [items, roomTypes] = await Promise.all([
          fetchRoomTypeAvailability(),
          fetchRoomTypeCatalog(),
        ]);
        const byId = {};
        const byName = {};
        items.forEach((item) => {
          byId[String(item.room_type_id)] = Number(item.available_count) || 0;
          byName[normalizeTypeName(item.name)] = Number(item.available_count) || 0;
        });
        const descById = {};
        const descByName = {};
        roomTypes.forEach((rt) => {
          const desc = String(rt.description || "").trim();
          descById[String(rt._id)] = desc;
          descByName[normalizeTypeName(rt.name)] = desc;
          if (rt.code) descByName[normalizeTypeName(rt.code)] = desc;
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
    };
    fetchAvailability();
  }, []);

  if (loading) {
    return (
      <div
        className="d-flex justify-content-center align-items-center py-5"
        style={{ minHeight: "60vh" }}
      >
        <div
          className="spinner-border text-primary"
          role="status"
          style={{ width: "3rem", height: "3rem" }}
        >
          <span className="visually-hidden">Đang tải...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="alert alert-danger text-center mx-5 my-5 py-4 fs-5">
        ❌ {error}
      </div>
    );
  }

  const displayRooms = Array.isArray(rooms) ? rooms : [];

  return (
    <>
      <section className="home-hero">
        <div className="home-hero-bg" />
        <div className="hh-container home-hero-inner">
          <h1 className="home-hero-title">Hanoi Hotel</h1>
          <div className="home-hero-subtitle">Live Oriental Heritage</div>
        </div>
        <SearchBar />
      </section>

      <section className="py-5 bg-light">
        <div className="container">
          <div className="d-flex justify-content-between align-items-end mb-4">
            <div>
              <h3 className="fw-bold mb-1">Ưu đãi nổi bật</h3>
              <p className="text-muted">
                {displayRooms.length > 0
                  ? `${displayRooms.length} loại phòng nổi bật`
                  : "Khám phá các loại phòng nổi bật"}
              </p>
            </div>
            <Link to="/khach-san" className="text-primary fw-medium text-decoration-none">
              Xem tất cả →
            </Link>
          </div>

          {displayRooms.length === 0 ? (
            <div className="text-center py-5">
              <p className="text-muted fs-5">Hiện chưa có phòng nào.</p>
            </div>
          ) : (
            <div className="row g-4">
              {displayRooms.map((room) => (
                <div className="col-md-6 col-lg-4" key={room._id}>
                  <RoomTypeCardStructured
                    room={room}
                    imageSrc={
                      room.image?.startsWith("http")
                        ? room.image
                        : room.image
                          ? `/uploads/${room.image}`
                          : fallbackRoomImage
                    }
                    ratingAvg={ratings[room._id]?.avg ?? 0}
                    ratingTotal={ratings[room._id]?.total ?? 0}
                    availableCount={
                      room.roomType
                        ? (availabilityByTypeId[String(room.roomType)] ?? 0)
                        : (availabilityByName[normalizeTypeName(room.name)] ?? 0)
                    }
                    description={
                      room.roomType
                        ? descriptionByTypeId[String(room.roomType)] || "Mô tả đang cập nhật."
                        : descriptionByName[normalizeTypeName(room.name)] ||
                          "Mô tả đang cập nhật."
                    }
                    showBookButton={!isAdmin}
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    </>
  );
}
