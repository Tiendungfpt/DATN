import { useEffect, useState } from "react";
import axios from "axios";
import { Link, useSearchParams } from "react-router-dom";
import RoomTypeCardStructured from "../components/RoomTypeCardStructured";
import {
  FEATURED_ROOM_SLOTS,
  roomMatchesFeaturedSlot,
} from "../constants/featuredRoomTypes";
import {
  fetchRoomTypeAvailability,
  fetchRoomTypeCatalog,
  normalizeTypeName,
} from "../services/availabilityApi";

function HotelList() {
  const [visibleCount, setVisibleCount] = useState(3);

  const [ratings, setRatings] = useState({});
  const [allReviews, setAllReviews] = useState([]);
  const [globalSummary, setGlobalSummary] = useState({ avg: 0, total: 0 });

  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchParams] = useSearchParams();
  const [isAdmin, setIsAdmin] = useState(false);
  const [availabilityByTypeId, setAvailabilityByTypeId] = useState({});
  const [availabilityByName, setAvailabilityByName] = useState({});
  const [descriptionByTypeId, setDescriptionByTypeId] = useState({});
  const [descriptionByName, setDescriptionByName] = useState({});

  // ================= FETCH REVIEWS =================
  useEffect(() => {
    const fetchGlobalSummary = async () => {
      try {
        const reviewList = [];

        await Promise.all(
          rooms.map(async (room) => {
            try {
              const reviews = await axios.get(
                `http://localhost:3000/api/reviews/room/${room._id}`
              );
              reviewList.push(...reviews.data);
            } catch { }
          })
        );

        // ✅ remove duplicate nếu có
        const uniqueReviews = Array.from(
          new Map(reviewList.map((r) => [r._id, r])).values()
        );

        // ✅ tính lại summary đúng với list
        const total = uniqueReviews.length;
        const avg =
          total > 0
            ? (
              uniqueReviews.reduce((sum, r) => sum + r.rating, 0) /
              total
            ).toFixed(1)
            : 0;

        setAllReviews(uniqueReviews);
        setGlobalSummary({ avg, total });
      } catch (err) {
        console.log(err);
      }
    };

    if (rooms.length > 0) fetchGlobalSummary();
  }, [rooms]);

  // ================= RATINGS =================
  useEffect(() => {
    const fetchRatings = async () => {
      const ratingData = {};

      await Promise.all(
        rooms.map(async (room) => {
          try {
            const res = await axios.get(
              `http://localhost:3000/api/reviews/room/${room._id}/summary`
            );
            ratingData[room._id] = res.data;
          } catch {
            ratingData[room._id] = { avg: 0, total: 0 };
          }
        })
      );

      setRatings(ratingData);
    };

    if (rooms.length > 0) fetchRatings();
  }, [rooms]);

  // ================= ADMIN CHECK =================
  useEffect(() => {
    try {
      const user = JSON.parse(localStorage.getItem("user") || "null");
      setIsAdmin(user?.role === "admin");
    } catch {
      setIsAdmin(false);
    }
  }, []);

  // ================= FETCH ROOMS =================
  useEffect(() => {
    const checkIn = searchParams.get("check_in_date");
    const checkOut = searchParams.get("check_out_date");
    const capacity = searchParams.get("capacity");
    const isSearching = Boolean(checkIn && checkOut && capacity);

    axios
      .get(
        isSearching
          ? "http://localhost:3000/api/rooms/search"
          : "http://localhost:3000/api/rooms",
        {
          params: isSearching
            ? {
              check_in_date: checkIn,
              check_out_date: checkOut,
              capacity,
            }
            : undefined,
        }
      )
      .then((res) => {
        const roomList = Array.isArray(res.data) ? res.data : [];

        const selected = [];
        FEATURED_ROOM_SLOTS.forEach((slot) => {
          const found = roomList.find((r) =>
            roomMatchesFeaturedSlot(r, slot)
          );
          if (found) selected.push(found);
        });

        setRooms(selected);
        setLoading(false);
      })
      .catch(() => {
        setError("Không thể tải danh sách phòng.");
        setLoading(false);
      });
  }, [searchParams]);

  useEffect(() => {
    const checkIn = searchParams.get("check_in_date");
    const checkOut = searchParams.get("check_out_date");
    const isSearching = Boolean(checkIn && checkOut);
    const fetchAvailability = async () => {
      try {
        const [items, roomTypes] = await Promise.all([
          fetchRoomTypeAvailability(
            isSearching ? { check_in_date: checkIn, check_out_date: checkOut } : {},
          ),
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
  }, [searchParams]);

  // ✅ dùng toàn bộ review (KHÔNG FILTER)
  const featuredReviews = allReviews;

  // ✅ reset về 3 khi data thay đổi
  useEffect(() => {
    setVisibleCount(3);
  }, [featuredReviews.length]);

  if (loading)
    return (
      <div className="text-center py-5">
        <div className="spinner-border text-primary"></div>
      </div>
    );

  if (error)
    return <div className="alert alert-danger text-center">{error}</div>;

  return (
    <div className="container py-5">
      <h1 className="fw-bold mb-4">Danh sách phòng</h1>

      <div className="row g-4">
        {rooms.map((room) => (
          <div className="col-md-6 col-lg-4" key={room._id}>
            <RoomTypeCardStructured
              room={room}
              imageSrc={
                room.image?.startsWith("http")
                  ? room.image
                  : `http://localhost:3000/uploads/${room.image}`
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
            {isAdmin && (
              <p className="text-muted small mt-2 mb-0">
                {"Admin không đặt phòng qua trang khách — dùng quản trị booking."}
              </p>
            )}
          </div>
        ))}
      </div>

      {/* REVIEW */}
      <div className="mt-5 p-4 bg-white rounded shadow">
        <h3 className="fw-bold text-center mb-3">
          ⭐ Đánh giá từ khách hàng
        </h3>

        <div className="text-center mb-4">
          <h1 className="text-warning">{globalSummary.avg} / 5</h1>
          <p className="text-muted">{globalSummary.total} đánh giá</p>
        </div>

        {featuredReviews.length === 0 ? (
          <p className="text-center text-muted">Chưa có đánh giá</p>
        ) : (
          featuredReviews.slice(0, visibleCount).map((r) => (
            <div key={r._id} className="border-top pt-3 mb-3">
              <p className="fw-bold">
                👤 {r.user_id?.name || "Ẩn danh"}
              </p>

              <p className="text-primary">
                🏨 {r.room_id?.room_no} -{" "}
                {r.room_id?.name || "—"}
              </p>

              <p className="text-warning">⭐ {r.rating} / 5</p>

              <p className="text-muted">
                {r.comment || "Không có nhận xét"}
              </p>
              {r.adminReply ? (
                <div className="alert alert-primary py-2 px-3">
                  <strong>Phản hồi từ khách sạn:</strong> {r.adminReply}
                </div>
              ) : null}
            </div>
          ))
        )}

        {/* BUTTON */}
        {featuredReviews.length > 2 && (
          <div className="text-center">
            {visibleCount < featuredReviews.length ? (
              <button
                className="btn btn-outline-primary"
                onClick={() =>
                  setVisibleCount(featuredReviews.length)
                }
              >
                Xem thêm
              </button>
            ) : (
              <button
                className="btn btn-outline-secondary"
                onClick={() => setVisibleCount(2)}
              >
                Thu gọn
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default HotelList;