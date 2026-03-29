import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import axios from "axios";
import "../admin/components/List.css";
import "./style/RoomsPublic.css";
import { addDaysLocal, localISODate } from "../utils/dateLocal";
import { PUBLIC_ROOM_TYPES, getRoomTypeLabel } from "../data/roomTypes";

const API = "http://localhost:3000/api";

function todayStr() {
  return localISODate();
}
function tomorrowStr() {
  return addDaysLocal(1);
}

function RoomsList() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState("");
  const [form, setForm] = useState({
    checkIn: searchParams.get("checkIn") || todayStr(),
    checkOut: searchParams.get("checkOut") || tomorrowStr(),
    adults: searchParams.get("adults") || "2",
    children: searchParams.get("children") || "0",
    roomType: searchParams.get("roomType") || "",
  });

  useEffect(() => {
    setForm({
      checkIn: searchParams.get("checkIn") || todayStr(),
      checkOut: searchParams.get("checkOut") || tomorrowStr(),
      adults: searchParams.get("adults") || "2",
      children: searchParams.get("children") || "0",
      roomType: searchParams.get("roomType") || "",
    });
  }, [searchParams]);

  useEffect(() => {
    const params = {
      checkIn: searchParams.get("checkIn") || todayStr(),
      checkOut: searchParams.get("checkOut") || tomorrowStr(),
      adults: searchParams.get("adults") || "2",
      children: searchParams.get("children") || "0",
    };
    const rt = searchParams.get("roomType");
    if (rt) params.roomType = rt;

    let cancelled = false;
    setLoading(true);
    setFetchError("");
    axios
      .get(`${API}/rooms/available`, { params })
      .then((res) => {
        if (!cancelled) setRooms(Array.isArray(res.data) ? res.data : []);
      })
      .catch((err) => {
        if (!cancelled) {
          setRooms([]);
          const msg =
            err.response?.data?.message ||
            err.message ||
            "Không gọi được API. Hãy chạy backend (port 3000) và thử lại.";
          setFetchError(msg);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [searchParams]);

  const handleApply = (e) => {
    e.preventDefault();
    const next = new URLSearchParams();
    next.set("checkIn", form.checkIn);
    next.set("checkOut", form.checkOut);
    next.set("adults", form.adults);
    next.set("children", form.children);
    if (form.roomType) next.set("roomType", form.roomType);
    setSearchParams(next);
  };

  const checkIn =
    searchParams.get("checkIn") || form.checkIn || todayStr();
  const checkOut =
    searchParams.get("checkOut") || form.checkOut || tomorrowStr();

  const goToRoomDetail = (roomId) => {
    const q = new URLSearchParams({
      checkIn,
      checkOut,
      adults: searchParams.get("adults") || form.adults || "2",
      children: searchParams.get("children") || form.children || "0",
    });
    navigate(`/phong/${roomId}?${q.toString()}`);
  };

  return (
    <div className="rooms-booking-page">
      <aside className="rooms-booking-sidebar">
        <h2>Tìm phòng</h2>
        <form onSubmit={handleApply}>
          <div className="rooms-booking-field">
            <label htmlFor="rb-checkin">Ngày nhận phòng</label>
            <input
              id="rb-checkin"
              type="date"
              min={todayStr()}
              value={form.checkIn}
              onChange={(e) =>
                setForm((f) => ({ ...f, checkIn: e.target.value }))
              }
            />
          </div>
          <div className="rooms-booking-field">
            <label htmlFor="rb-checkout">Ngày trả phòng</label>
            <input
              id="rb-checkout"
              type="date"
              min={form.checkIn || todayStr()}
              value={form.checkOut}
              onChange={(e) =>
                setForm((f) => ({ ...f, checkOut: e.target.value }))
              }
            />
          </div>
          <div className="rooms-booking-field">
            <label htmlFor="rb-adults">Người lớn</label>
            <select
              id="rb-adults"
              value={form.adults}
              onChange={(e) =>
                setForm((f) => ({ ...f, adults: e.target.value }))
              }
            >
              {[1, 2, 3, 4, 5, 6].map((n) => (
                <option key={n} value={String(n)}>
                  {n}
                </option>
              ))}
            </select>
          </div>
          <div className="rooms-booking-field">
            <label htmlFor="rb-children">Trẻ em</label>
            <select
              id="rb-children"
              value={form.children}
              onChange={(e) =>
                setForm((f) => ({ ...f, children: e.target.value }))
              }
            >
              {[0, 1, 2, 3, 4].map((n) => (
                <option key={n} value={String(n)}>
                  {n}
                </option>
              ))}
            </select>
          </div>
          <div className="rooms-booking-field">
            <label htmlFor="rb-type">Loại phòng</label>
            <select
              id="rb-type"
              value={form.roomType}
              onChange={(e) =>
                setForm((f) => ({ ...f, roomType: e.target.value }))
              }
            >
              <option value="">Tất cả</option>
              {PUBLIC_ROOM_TYPES.map((t) => (
                <option key={t.key} value={t.key}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>
          <button type="submit" className="rooms-booking-apply">
            Áp dụng
          </button>
        </form>
      </aside>

      <main className="rooms-booking-main">
        <h1>Thịnh Phát Hotel</h1>
        <p className="rooms-booking-meta">
          Phòng còn trống phù hợp ngày{" "}
          <strong>
            {checkIn} → {checkOut}
          </strong>
          {searchParams.get("roomType") && (
            <>
              {" "}
              · Loại:{" "}
              <strong>
                {searchParams.get("roomType")}
              </strong>
            </>
          )}
        </p>

        {loading ? (
          <div className="hotel-container">
            <p>Đang tải phòng…</p>
          </div>
        ) : fetchError ? (
          <div className="hotel-container">
            <p className="rooms-booking-error">{fetchError}</p>
          </div>
        ) : !rooms.length ? (
          <div className="hotel-container rooms-booking-empty">
            <p>
              Không có phòng phù hợp. Thử giảm tổng số khách (người lớn + trẻ)
              so với <code>maxGuests</code> của phòng, đổi ngày, hoặc bỏ lọc loại
              phòng.
            </p>
            {searchParams.get("roomType") ? (
              <p>
                Bạn đang lọc theo{" "}
                <strong>{getRoomTypeLabel(searchParams.get("roomType"))}</strong>.
                Thử chọn <strong>Tất cả</strong> ở cột trái rồi nhấn{" "}
                <strong>Áp dụng</strong>, hoặc kiểm tra tên phòng trong admin có
                chứa từ khóa đúng loại (để lọc khớp).
              </p>
            ) : null}
            <p className="rooms-booking-hint">
              Nếu trong MongoDB collection <code>bookings</code> có bản ghi
              trùng ngày với phòng này (pending/confirmed), phòng sẽ bị ẩn cho
              khoảng đó.
            </p>
          </div>
        ) : (
          <div className="hotel-grid">
            {rooms.map((room) => (
              <div className="hotel-card" key={room._id}>
                <img
                  src={
                    room.image?.startsWith("http")
                      ? room.image
                      : `http://localhost:3000/uploads/${room.image}`
                  }
                  alt={room.name}
                />

                <div className="hotel-info">
                  <p className="rooms-booking-hotel-name">Thịnh Phát Hotel</p>
                  <h3>{room.name}</h3>

                  <p className="desc">{room.description}</p>

                  <p className="price">
                    💰 {room.price?.toLocaleString("vi-VN")} đ / đêm
                  </p>

                  <p className="capacity">
                    👤 Tối đa {room.maxGuests ?? "—"} người
                    {room.capacity ? ` · ${room.capacity}` : ""}
                  </p>

                  <p
                    className={
                      room.status === "available"
                        ? "status available"
                        : room.status === "maintenance"
                          ? "status maintenance"
                          : "status booked"
                    }
                  >
                    {room.status === "available"
                      ? "Còn trống"
                      : room.status === "maintenance"
                        ? "Bảo trì"
                        : room.status}
                  </p>

                  <div className="admin-actions">
                    <button
                      type="button"
                      className="btn-edit"
                      onClick={() => goToRoomDetail(room._id)}
                    >
                      Chi tiết &amp; đặt
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

export default RoomsList;
